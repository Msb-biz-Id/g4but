<?php

namespace App\Services\Whatsapp;

/**
 * WhatsApp phone number normalization (BRD FR-WA-002, RULE-013..014).
 *
 * Converts any Indonesian phone number into a canonical E.164-lite string
 * (digits only, 62 prefix, no leading zero or +) so inbound sender numbers
 * match stored identities consistently.
 */
class PhoneNormalizer
{
    /**
     * Normalize to canonical digits-only format (62 prefix).
     */
    public function normalize(string $phone): string
    {
        $digits = preg_replace('/[^0-9]/', '', (string) $phone);

        if ($digits === '') {
            return '';
        }

        // Indonesian local format starting with 0 -> replace with 62
        if (str_starts_with($digits, '0')) {
            $digits = '62'.substr($digits, 1);
        } elseif (str_starts_with($digits, '8')) {
            $digits = '62'.$digits;
        } elseif (! str_starts_with($digits, '62')) {
            $digits = '62'.$digits;
        }

        return $digits;
    }
}
