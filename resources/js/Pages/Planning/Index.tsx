import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { PageProps } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { 
    FileText, 
    GitBranch, 
    ChevronRight, 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanningStats {
    documents: number;
    treeCount: number;
    rootTrees: number;
    agreements: number;
    actionPlans: number;
    crosscutting: number;
    risks: number;
    cascading: number;
}

interface RecentDocument {
    id: number;
    title: string;
    type: string;
    status: string;
    organization?: { short_name?: string; name: string };
    performancePeriod?: { year: number };
}

interface RecentRisk {
    id: number;
    risk_event: string;
    risk_level: string;
    organization?: { short_name?: string };
}

interface PlanningIndexProps extends PageProps {
    stats: PlanningStats;
    recentDocuments: RecentDocument[];
    recentRisks: RecentRisk[];
}

export default function PlanningIndex({ auth, stats, recentDocuments, recentRisks }: PlanningIndexProps) {
    const getStatusVariant = (status: string) => {
        switch (status.toLowerCase()) {
            case 'approved': return 'success';
            case 'review': return 'warning';
            case 'draft':
            case 'locked':
            default: return 'secondary';
        }
    };


    const submodules = [
        {
            title: 'Dokumen Perencanaan',
            description: 'Kelola Renstra, Renja, dan dokumen perencanaan lainnya',
            icon: FileText,
            href: route('planning.documents.index'),
            color: 'text-blue-500',
            bgColor: 'bg-blue-100 dark:bg-blue-900/20'
        },
        {
            title: 'Pohon Kinerja',
            description: 'Visualisasi dan manajemen struktur kinerja berjenjang',
            icon: GitBranch,
            href: route('planning.trees.index'),
            color: 'text-green-500',
            bgColor: 'bg-green-100 dark:bg-green-900/20'
        }
    ];

    return (
        <AuthenticatedLayout
            header="Perencanaan Kinerja"
        >
            <Head title="Perencanaan Kinerja" />

            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card>
                        <CardContent className="p-4 sm:p-6 flex items-center space-x-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                <FileText className="w-6 h-6 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Dokumen</p>
                                <h3 className="text-2xl font-bold">{stats.documents}</h3>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 sm:p-6 flex items-center space-x-4">
                            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                                <GitBranch className="w-6 h-6 text-green-500" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Simpul Pohon</p>
                                <h3 className="text-2xl font-bold">{stats.treeCount}</h3>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        {submodules.map((module, index) => (
                            <Link key={index} href={module.href}>
                                <Card className="h-full hover:-translate-y-0.5 hover:shadow-md transition-all">
                                    <CardContent className="p-4 sm:p-6 flex items-start space-x-4">
                                        <div className={cn("p-3 rounded-lg shrink-0", module.bgColor)}>
                                            <module.icon className={cn("w-6 h-6", module.color)} />
                                        </div>
                                        <div className="space-y-1 min-w-0">
                                            <h3 className="font-semibold text-sm sm:text-base truncate">{module.title}</h3>
                                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{module.description}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6 pb-2 space-y-0">
                            <CardTitle className="text-base font-semibold">Dokumen Terbaru</CardTitle>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={route('planning.documents.index')}>
                                    Lihat Semua <ChevronRight className="ml-1 w-4 h-4" />
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0 sm:p-6 sm:pt-0">
                            {recentDocuments.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-10">No</TableHead>
                                                <TableHead>Judul</TableHead>
                                                <TableHead>Unit</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {recentDocuments.map((doc, index) => (
                                                <TableRow key={doc.id}>
                                                    <TableCell className="text-sm text-gray-500 tabular-nums">
                                                        {index + 1}
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {doc.title}
                                                        {doc.performancePeriod && (
                                                            <span className="block text-xs text-muted-foreground">
                                                                {doc.performancePeriod.year}
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>{doc.organization?.short_name || doc.organization?.name || '-'}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={getStatusVariant(doc.status) as any}>
                                                            {doc.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-sm text-muted-foreground">
                                    Belum ada dokumen terbaru
                                </div>
                            )}
                        </CardContent>
                    </Card>
            </div>
        </AuthenticatedLayout>
    );
}
