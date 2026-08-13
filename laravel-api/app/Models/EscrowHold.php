<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class EscrowHold extends Model
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = ['shipment_id', 'wallet_id', 'amount', 'currency', 'status', 'created_at', 'resolved_at'];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:4',
            'created_at' => 'datetime',
            'resolved_at' => 'datetime',
        ];
    }

    public function shipment()
    {
        return $this->belongsTo(Shipment::class);
    }

    public function wallet()
    {
        return $this->belongsTo(Wallet::class);
    }
}
