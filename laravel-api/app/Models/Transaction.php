<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Transaction extends Model
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'type', 'status', 'amount', 'currency', 'fee_amount', 'fx_spread_amount',
        'source_wallet_id', 'destination_wallet_id', 'idempotency_key',
        'shipment_id', 'reference', 'narration', 'metadata',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:4',
            'fee_amount' => 'decimal:4',
            'fx_spread_amount' => 'decimal:4',
            'metadata' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Transaction $transaction) {
            $transaction->reference ??= (string) Str::uuid();
        });
    }

    public function sourceWallet()
    {
        return $this->belongsTo(Wallet::class, 'source_wallet_id');
    }

    public function destinationWallet()
    {
        return $this->belongsTo(Wallet::class, 'destination_wallet_id');
    }

    public function shipment()
    {
        return $this->belongsTo(Shipment::class);
    }
}
