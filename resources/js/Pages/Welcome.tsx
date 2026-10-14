import LandingPreloader from '@/Components/Landing/LandingPreloader';
import Hero from '@/Components/Landing/Hero';
import CivicPortals from '@/Components/Landing/CivicPortals';
import PuprOrgStructure from '@/Components/Landing/PuprOrgStructure';
import Workflow from '@/Components/Landing/Workflow';
import AiPreview from '@/Components/Landing/AiPreview';
import Governance from '@/Components/Landing/Governance';
import Faq from '@/Components/Landing/Faq';
import InfoCta from '@/Components/Landing/InfoCta';
import { LandingStats } from '@/Components/Landing/types';
import PublicLayout from '@/Layouts/PublicLayout';
import { PageProps } from '@/types';
import { Head, usePage } from '@inertiajs/react';

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
    const { appConfig } = usePage<PageProps>().props;
    const appName = appConfig?.appName || 'SIM Kinerja';
    const instansiName = appConfig?.instansiName || 'Pemerintah Daerah';
    const orgName = appConfig?.organizationName || 'Biro Organisasi Sekretariat Daerah';
    const appDescription = appConfig?.appDescription || 'Sistem Informasi Akuntabilitas Kinerja Terintegrasi';
    const logoUrl = appConfig?.logoUrl || '/logo.webp';
    const titleText = `${appName} • Sistem Akuntabilitas Kinerja ${instansiName}`;
    const descText = `${appName} - ${appDescription} ${instansiName}. Portal resmi perencanaan, pengukuran indikator kinerja (IKU), pohon kinerja terpadu, evaluasi SAKIP, dan transparansi laporan publik.`;

    return (
        <PublicLayout active="home">
            <LandingPreloader />

            <Head>
                <title>{titleText}</title>
                <meta name="description" content={descText} />
                <meta
                    name="keywords"
                    content={`${appName.toLowerCase()}, sakip, akuntabilitas kinerja, ${instansiName.toLowerCase()}, iku, renstra, pohon kinerja, informasi publik`}
                />
                <meta property="og:title" content={titleText} />
                <meta property="og:description" content={descText} />
                <meta property="og:type" content="website" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={titleText} />
                <meta name="twitter:description" content={descText} />
                <script type="application/ld+json">
                    {JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'GovernmentOrganization',
                        name: instansiName,
                        alternateName: orgName,
                        url: typeof window !== 'undefined' ? window.location.origin : '',
                        logo: typeof window !== 'undefined' ? window.location.origin + logoUrl : '',
                        description: `${appDescription} (${appName}).`,
                    })}
                </script>
            </Head>

            {/* Editorial Civic Headquarters & Quick Search */}
            <Hero
                user={auth.user}
                canLogin={canLogin}
                canRegister={canRegister}
                stats={stats}
            />

            {/* Direct Public Services: Pohon Kinerja, Laporan SAKIP, Pusat Regulasi */}
            <CivicPortals />

            {/* Bagan Struktur Organisasi Resmi PUPR Mimika (4 Bidang, 12 Seksi, UPTD) */}
            <PuprOrgStructure />

            {/* 4 Siklus Akuntabilitas Kinerja (PermenPAN-RB No. 88/2021) */}
            <Workflow />

            {/* Asisten Analitik & Ringkasan Eksekutif Terverifikasi */}
            <AiPreview />

            {/* Standar Tata Kelola, Keamanan Data ASN, & Jejak Audit */}
            <Governance />

            {/* Tanya Jawab Seputar SAKIP & Sistem */}
            <Faq />

            {/* Banner Keterbukaan Informasi & Akses Portal */}
            <InfoCta user={auth.user} />
        </PublicLayout>
    );
}
