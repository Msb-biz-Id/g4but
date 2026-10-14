import { Card } from '@/Components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import PageHeader from '@/Components/Dashboard/PageHeader';

export default function Edit({
    mustVerifyEmail,
    status,
}: PageProps<{ mustVerifyEmail: boolean; status?: string }>) {
    return (
        <AuthenticatedLayout
            header="Profil Pengguna"
        >
            <Head title="Profil Pengguna" />

            <div className="py-6">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    <PageHeader
                        breadcrumbs={[
                            { label: 'Akun' },
                            { label: 'Profil Pengguna' },
                        ]}
                        title="Profil & Keamanan Akun"
                        description="Perbarui informasi data diri aparatur, alamat email resmi, serta kata sandi akun Anda."
                    />
                    <Card className="p-4 sm:p-8">
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                            className="max-w-xl"
                        />
                    </Card>

                    <Card className="p-4 sm:p-8">
                        <UpdatePasswordForm className="max-w-xl" />
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
