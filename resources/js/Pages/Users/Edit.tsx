import { Head } from '@inertiajs/react';
import { Card } from '@/Components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import UserForm from './UserForm';

interface Props extends PageProps {
    user: {
        id: number;
        name: string;
        email: string;
        employee_number: string | null;
        job_title: string | null;
        is_active: boolean;
        roles: Array<{ id: number; name: string }>;
        organizations: Array<{
            id: number;
            code: string;
            name: string;
        }>;
    };
    roles: Array<{ id: number; name: string }>;
    organizations: Array<{
        id: number;
        code: string;
        name: string;
    }>;
}

export default function UsersEdit({ user, roles, organizations }: Props) {
    return (
        <AuthenticatedLayout
            header="Edit Pengguna"
        >
            <Head title="Edit Pengguna" />
            <div className="py-12">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    <Card className="p-6">
                        <UserForm
                            roles={roles}
                            organizations={organizations}
                            user={user}
                        />
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}