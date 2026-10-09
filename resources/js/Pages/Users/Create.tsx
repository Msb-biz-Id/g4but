import { Head } from '@inertiajs/react';
import { Card } from '@/Components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import UserForm from './UserForm';

interface Props extends PageProps {
    roles: Array<{ id: number; name: string }>;
    organizations: Array<{
        id: number;
        code: string;
        name: string;
    }>;
}

export default function UsersCreate({ roles, organizations }: Props) {
    return (
        <AuthenticatedLayout
            header="Tambah Pengguna"
        >
            <Head title="Tambah Pengguna" />
            <div className="py-12">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    <Card className="p-6">
                        <UserForm
                            roles={roles}
                            organizations={organizations}
                        />
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}