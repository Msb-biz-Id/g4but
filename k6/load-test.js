import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ============================================================
//  e-KASUARI — Load Test Suite (FR-OPS-PERF)
//  Target MVP: p95 < 5000ms, error rate < 1%, 50 VU concurrent
//
//  Penggunaan:
//    # Smoke test (1 VU, 30 detik) — verifikasi pipeline
//    k6 run k6/load-test.js --env SCENARIO=smoke \
//      --env BASE_URL=https://ekasuari.domain.go.id \
//      --env LOGIN_EMAIL=admin@ekasuari.test \
//      --env LOGIN_PASSWORD=password
//
//    # Load test penuh (ramp-up ke 50 VU)
//    k6 run k6/load-test.js --env SCENARIO=load \
//      --env BASE_URL=https://ekasuari.domain.go.id \
//      --env LOGIN_EMAIL=admin@ekasuari.test \
//      --env LOGIN_PASSWORD=password
//
//    # Health check only
//    k6 run k6/load-test.js --env SCENARIO=health \
//      --env BASE_URL=https://ekasuari.domain.go.id
// ============================================================

// Metrik kustom
const errorRate      = new Rate('ekasuari_errors');
const dashboardTrend = new Trend('ekasuari_dashboard_duration');
const loginTrend     = new Trend('ekasuari_login_duration');
const healthTrend    = new Trend('ekasuari_health_duration');

const BASE_URL  = __ENV.BASE_URL          || 'http://localhost:8000';
const EMAIL     = __ENV.LOGIN_EMAIL       || 'admin@ekasuari.test';
const PASSWORD  = __ENV.LOGIN_PASSWORD    || 'password';
const SCENARIO  = __ENV.SCENARIO          || 'smoke';

// ── Konfigurasi Skenario ─────────────────────────────────────
export const options = {
    scenarios: {
        // Smoke: 1 VU, 30 detik — verifikasi setup dan pipeline CI/CD
        smoke: {
            executor: 'constant-vus',
            vus: 1,
            duration: '30s',
            exec: 'healthFlow',
            env: { SCENARIO: 'smoke' },
            startTime: SCENARIO === 'smoke' ? '0s' : '999999s',
        },

        // Load: ramp-up ke 50 VU sesuai target MVP (3-5 OPD pilot)
        load: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '1m', target: 10 },  // ramp up perlahan
                { duration: '2m', target: 20 },  // target 20 concurrent
                { duration: '2m', target: 50 },  // puncak — 50 concurrent
                { duration: '1m', target: 0  },  // ramp down
            ],
            exec: 'fullUserFlow',
            startTime: SCENARIO === 'load' ? '0s' : '999999s',
        },

        // Health: hanya test endpoint /health setiap detik
        health: {
            executor: 'constant-arrival-rate',
            rate: 1,
            timeUnit: '1s',
            duration: '30s',
            preAllocatedVUs: 2,
            exec: 'healthFlow',
            startTime: SCENARIO === 'health' ? '0s' : '999999s',
        },
    },

    thresholds: {
        // Target utama BRD §23
        http_req_duration:          ['p(95)<5000'],  // p95 < 5 detik
        http_req_failed:            ['rate<0.01'],   // error rate < 1%
        // Target per endpoint
        ekasuari_dashboard_duration: ['p(95)<5000'],
        ekasuari_login_duration:     ['p(95)<3000'],
        ekasuari_health_duration:    ['p(99)<500'],  // health check harus sangat cepat
        ekasuari_errors:             ['rate<0.01'],
    },
};

// ── Helper: ambil CSRF token ─────────────────────────────────
function getCsrfToken(loginPageResponse) {
    const match = loginPageResponse.html().find('meta[name="csrf-token"]').attr('content');
    return match || '';
}

// ── Flow 1: Health Check saja ────────────────────────────────
export function healthFlow() {
    group('health_check', () => {
        const res = http.get(`${BASE_URL}/health`, {
            tags: { endpoint: 'health' },
        });

        healthTrend.add(res.timings.duration);
        errorRate.add(res.status !== 200 && res.status !== 503);

        check(res, {
            'health endpoint reachable': (r) => r.status === 200 || r.status === 503,
            'health response is JSON':   (r) => r.headers['Content-Type']?.includes('application/json'),
            'health has status field':   (r) => JSON.parse(r.body)?.status !== undefined,
            'health reports ok or degraded': (r) => ['ok', 'degraded'].includes(JSON.parse(r.body)?.status),
        });
    });

    sleep(1);
}

// ── Flow 2: Halaman login saja (unauthenticated) ─────────────
export function loginPageFlow() {
    group('login_page', () => {
        const res = http.get(`${BASE_URL}/login`, {
            tags: { endpoint: 'login_page' },
        });

        check(res, {
            'login page ok': (r) => r.status === 200,
            'login page has form': (r) => r.body.includes('email'),
        });

        errorRate.add(res.status !== 200);
    });

    sleep(1);
}

// ── Flow 3: Sesi user lengkap (login → dashboard → logout) ──
export function fullUserFlow() {
    const jar = http.cookieJar();

    group('auth_flow', () => {
        // Step 1: GET login page (untuk mendapat session + CSRF)
        const loginPage = http.get(`${BASE_URL}/login`, { jar });

        check(loginPage, {
            'login page accessible': (r) => r.status === 200,
        });

        loginTrend.add(loginPage.timings.duration);

        // Ambil XSRF token dari cookie
        const xsrfToken = jar.cookiesForURL(`${BASE_URL}/login`)
            .find(c => c.name === 'XSRF-TOKEN')?.value || '';

        sleep(1);

        // Step 2: POST login
        const loginRes = http.post(
            `${BASE_URL}/login`,
            {
                email:    EMAIL,
                password: PASSWORD,
            },
            {
                jar,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-XSRF-TOKEN': decodeURIComponent(xsrfToken),
                },
                redirects: 0,
                tags: { endpoint: 'login_submit' },
            },
        );

        const loginOk = loginRes.status === 302 || loginRes.status === 200;
        errorRate.add(!loginOk);

        check(loginRes, {
            'login succeeded (redirect)': (r) => r.status === 302 || r.status === 200,
        });

        sleep(1);
    });

    group('dashboard', () => {
        // Step 3: Akses dashboard
        const dashboard = http.get(`${BASE_URL}/dashboard`, { jar });

        dashboardTrend.add(dashboard.timings.duration);
        errorRate.add(dashboard.status !== 200 && dashboard.status !== 302);

        check(dashboard, {
            'dashboard accessible': (r) => r.status === 200 || r.status === 302,
        });

        sleep(2);
    });

    group('logout', () => {
        // Step 4: Logout
        const xsrfToken = jar.cookiesForURL(`${BASE_URL}/dashboard`)
            .find(c => c.name === 'XSRF-TOKEN')?.value || '';

        const logout = http.post(
            `${BASE_URL}/logout`,
            {},
            {
                jar,
                headers: {
                    'X-XSRF-TOKEN': decodeURIComponent(xsrfToken),
                },
                redirects: 0,
            },
        );

        check(logout, {
            'logout succeeded': (r) => r.status === 302 || r.status === 200,
        });
    });

    sleep(1);
}

// Default export (untuk smoke test tanpa SCENARIO env)
export default function () {
    healthFlow();
}
