<?php

namespace App\Contracts;

interface AiProvider
{
    /**
     * Nama provider (untuk log & pelabelan output, AIG-002).
     */
    public function name(): string;

    /**
     * Menghasilkan output AI dari prompt + konteks.
     *
     * @param  array<string, mixed>  $context
     * @return array{output: string}
     *
     * @throws \RuntimeException jika provider gagal
     */
    public function generate(string $feature, string $prompt, array $context): array;
}
