import LandingPreloader from '@/Components/Landing/LandingPreloader';
import AiPreview from '@/Components/Landing/AiPreview';
import Faq from '@/Components/Landing/Faq';
import Governance from '@/Components/Landing/Governance';
import Hero from '@/Components/Landing/Hero';
import InfoCta from '@/Components/Landing/InfoCta';
import Marquee from '@/Components/Landing/Marquee';
// import Modules from '@/Components/Landing/Modules';
// import Stats from '@/Components/Landing/Stats';
// import Workflow from '@/Components/Landing/Workflow';
import { LandingStats } from '@/Components/Landing/types';
import PublicLayout from '@/Layouts/PublicLayout';
import { PageProps } from '@/types';
import { Head } from '@inertiajs/react';

export default function Welcome({
    auth,
    canLogin,
    canRegister,
    stats,
}: PageProps<{
    canLogin: boolean;
    canRegister: boolean;
    stats: LandingStats;
}>) {
    return (
        <PublicLayout active="home">
            <LandingPreloader />

            <Head>
                <title>e-KASUARI • Sistem Akuntabilitas Kinerja Papua Barat</title>
                <meta
                    name="description"
                    content="e-KASUARI - Sistem Informasi Akuntabilitas Kinerja Terintegrasi Pemerintah Provinsi Papua Barat. Portal perencanaan, pengukuran kinerja SAKIP, evaluasi, dan informasi publik."
                />
                <meta
                    name="keywords"
                    content="e-kasuari, sakip papua barat, akuntabilitas kinerja, pemprov papua barat, iku, rpjmd, renstra, pohon kinerja, informasi publik papua barat"
                />
                <meta property="og:title" content="e-KASUARI • Sistem Akuntabilitas Kinerja Papua Barat" />
                <meta
                    property="og:description"
                    content="Portal Akuntabilitas Kinerja Pemerintah Provinsi Papua Barat berbasis digital. Transparan, terukur, dan akuntabel."
                />
                <meta property="og:type" content="website" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="e-KASUARI • Sistem Akuntabilitas Kinerja Papua Barat" />
                <meta
                    name="twitter:description"
                    content="Portal Akuntabilitas Kinerja Pemerintah Provinsi Papua Barat berbasis digital. Transparan, terukur, dan akuntabel."
                />
                <script type="application/ld+json">
                    {JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'GovernmentOrganization',
                        name: 'Pemerintah Provinsi Papua Barat',
                        alternateName: 'Pemprov Papua Barat',
                        url: typeof window !== 'undefined' ? window.location.origin : '',
                        logo: typeof window !== 'undefined' ? window.location.origin + '/images/logo-papua-barat.png' : '',
                        description: 'Sistem Informasi Akuntabilitas Kinerja Terintegrasi Pemerintah Provinsi Papua Barat (e-KASUARI).',
                    })}
                </script>
            </Head>

            <Hero
                user={auth.user}
                canLogin={canLogin}
                canRegister={canRegister}
            />

            <Marquee />

            {/* Hidden sesuai permintaan:
            <Stats stats={stats} />
            <Workflow />
            <Modules />
            */}

            <AiPreview />

            <Governance />

            <Faq />

            <InfoCta user={auth.user} />
        </PublicLayout>
    );
}
