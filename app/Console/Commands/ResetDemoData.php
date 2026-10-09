<?php

namespace App\Console\Commands;

use App\Models\ActionPlan;
use App\Models\Agreement;
use App\Models\Alert;
use App\Models\AppNotification;
use App\Models\AuditLog;
use App\Models\DocumentRevision;
use App\Models\Evaluation;
use App\Models\EvaluationFollowup;
use App\Models\EvaluationRecommendation;
use App\Models\EvaluationScore;
use App\Models\MonitoringActionPlanBudget;
use App\Models\MonitoringActionPlanOutput;
use App\Models\Organization;
use App\Models\PlanningDocument;
use App\Models\Realization;
use App\Models\RealizationEvidence;
use App\Models\RealizationIkuItem;
use App\Models\RealizationOpdItem;
use App\Models\RealizationRpjmdItem;
use Database\Seeders\AppConfigSeeder;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\IkuSeeder;
use Database\Seeders\KamarOpdSeeder;
use Database\Seeders\LocalUserSeeder;
use Database\Seeders\MasterPeriodSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class ResetDemoData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:reset-demo 
                            {--fresh : Jalankan migrate:fresh terlebih dahulu sebelum mengisi master data}
                            {--with-sample-iku : Sertakan contoh dummy IKU & target jika diperlukan}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Reset database ke kondisi 100% bersih (clean state) untuk demonstrasi penginputan data langsung ke klien.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->newLine();
        $this->info('====================================================================');
        $this->info('   e-KASUARI LITE: RESET DATA DEMO UNTUK LIVE INPUT KLIEN');
        $this->info('====================================================================');

        if ($this->option('fresh')) {
            $this->warn('Menjalankan migrate:fresh...');
            $this->call('migrate:fresh');
        } else {
            $this->info('Membersihkan data transaksional & form input (pohon kinerja, IKU, dokumen, PK, realisasi, evaluasi)...');
            $this->cleanTransactionalData();
        }

        $this->info('Memastikan data master dan fondasi sistem tersedia...');
        $this->seedMasterData();

        $this->cleanSampleFiles();

        Cache::flush();
        $this->line('   - Cache dashboard & analitik telah dibersihkan.');

        $this->newLine();
        $this->info('Database BERHASIL disiapkan dalam kondisi 100% BERSIH (Clean State)!');
        $this->newLine();

        $this->displaySummary();

        return Command::SUCCESS;
    }

    /**
     * Bersihkan seluruh tabel transaksi user tanpa merusak master data.
     */
    protected function cleanTransactionalData(): void
    {
        $driver = DB::getDriverName();

        $tablesToClean = [
            // 1. Pengukuran, Realisasi & Bukti Dukung
            'realization_evidences',
            'realization_iku_items',
            'realization_opd_items',
            'realization_rpjmd_items',
            'realizations',
            'monitoring_action_plan_budgets',
            'monitoring_action_plan_outputs',
            'action_plans',
            // 2. Perjanjian Kinerja
            'agreement_indicators',
            'agreements',
            // 3. Dokumen Perencanaan & Pohon Kinerja
            'document_revisions',
            'planning_documents',
            'planning_trees',
            // 4. IKU, Indikator, Target, Histori & Sasaran/Tujuan
            'iku_histories',
            'indicator_targets',
            'indicator_versions',
            'indicators',
            'strategic_objectives',
            'strategic_goals',
            // 5. Evaluasi SAKIP & PKO
            'pko_indicators',
            'pko_evaluations',
            'evaluation_followups',
            'evaluation_recommendations',
            'evaluation_scores',
            'evaluations',
            // 6. Early Warning, Notifikasi & Audit
            'alerts',
            'notifications',
            'audit_logs',
            // 7. Informasi Publik (Knowledge Base)
            'knowledge_documents',
        ];

        if ($driver === 'pgsql') {
            $existing = [];
            foreach ($tablesToClean as $table) {
                if (Schema::hasTable($table)) {
                    $existing[] = '"' . $table . '"';
                    $this->line("   - Dibersihkan: {$table}");
                }
            }
            if (!empty($existing)) {
                DB::statement('TRUNCATE TABLE ' . implode(', ', $existing) . ' CASCADE;');
            }
        } elseif ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = OFF;');
            foreach ($tablesToClean as $table) {
                if (Schema::hasTable($table)) {
                    DB::table($table)->delete();
                    $this->line("   - Dibersihkan: {$table}");
                }
            }
            DB::statement('PRAGMA foreign_keys = ON;');
        } else {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');
            foreach ($tablesToClean as $table) {
                if (Schema::hasTable($table)) {
                    DB::table($table)->truncate();
                    $this->line("   - Dibersihkan: {$table}");
                }
            }
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        }
    }

    /**
     * Jalankan seeder master & konfigurasi fondasi.
     */
    protected function seedMasterData(): void
    {
        $this->call('db:seed', ['--class' => DatabaseSeeder::class]);

        if ($this->option('with-sample-iku')) {
            $this->info('Menambahkan data dummy IKU & Target...');
            $this->call('db:seed', ['--class' => IkuSeeder::class]);
        }
    }

    /**
     * Bersihkan file demo sample PDF di storage.
     */
    protected function cleanSampleFiles(): void
    {
        $disks = ['public', 'local'];
        $folders = ['planning/documents', 'planning/agreements', 'lhe', 'evaluations', 'knowledge/documents'];

        foreach ($disks as $disk) {
            foreach ($folders as $folder) {
                if (Storage::disk($disk)->exists($folder)) {
                    $files = Storage::disk($disk)->files($folder);
                    foreach ($files as $file) {
                        if (str_ends_with($file, '.pdf')) {
                            Storage::disk($disk)->delete($file);
                        }
                    }
                }
            }
        }
        $this->line('   - File storage dummy PDF telah dibersihkan.');
    }

    /**
     * Tampilkan tabel ringkasan akun siap pakai untuk demo klien.
     */
    protected function displaySummary(): void
    {
        $this->info('DAFTAR AKUN SIAP PAKAI UNTUK DEMO KLIEN (Password: password):');
        $this->table(
            ['Peran (Role)', 'Instansi (OPD)', 'Email Login', 'Kegunaan Demo'],
            [
                ['Super Admin', 'Pemerintah Provinsi', 'admin@ekasuari.test', 'Setup sistem & konfigurasi penuh'],
                ['Admin Provinsi', 'Pemerintah Provinsi', 'admin.provinsi@ekasuari.test', 'Verifikasi & penetapan dokumen provinsi'],
                ['Operator Bappeda', 'Bappeda Papua Barat', 'operator.bappeda@ekasuari.test', 'Demo input dokumen perencanaan / IKU'],
                ['Validator Bappeda', 'Bappeda Papua Barat', 'validator.bappeda@ekasuari.test', 'Demo verifikasi capaian internal'],
                ['Operator PUPR', 'Dinas PUPR', 'operator.pupr@ekasuari.test', 'Demo penginputan realisasi triwulan & PDF'],
                ['Operator Koperasi', 'Dinas Koperasi & UKM', 'operator.koperasi@ekasuari.test', 'Demo pembuatan draft PK baru'],
                ['Inspektorat (APIP)', 'Inspektorat Daerah', 'inspektorat@ekasuari.test', 'Demo lembar evaluasi LKE & rekomendasi'],
                ['Pimpinan Daerah', 'Sekretaris Daerah', 'pimpinan@ekasuari.test', 'Demo tampilan dashboard eksekutif'],
            ]
        );

        $this->newLine();
        $this->comment('Kamar OPD yang tersedia (Kamar 1 s/d 10):');
        $this->line('  - Kamar 1: Biro Organisasi (operator: operator.organisasi@ekasuari.test)');
        $this->line('  - Kamar 2: Biro Pemerintahan (operator: operator.pemerintahan@ekasuari.test)');
        $this->line('  - Kamar 3: Dinas Pendidikan (operator: operator.disdik@ekasuari.test)');
        $this->line('  - Kamar 4: Dinas Kesehatan (operator: operator.dinkes@ekasuari.test)');
        $this->line('  - Kamar 5: Dinas PUPR (operator: operator.pupr@ekasuari.test)');
        $this->line('  - Kamar 6: Bappeda (operator: operator.bappeda@ekasuari.test)');
        $this->newLine();
    }
}
