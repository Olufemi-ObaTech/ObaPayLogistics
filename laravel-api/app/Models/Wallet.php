<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Wallet extends Model
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['user_id', 'currency', 'balance', 'held_balance', 'is_active'];

    protected function casts(): array
    {
        return [
            'balance' => 'decimal:4',
            'held_balance' => 'decimal:4',
            'is_active' => 'boolean',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function sentTransactions()
    {
        return $this->hasMany(Transaction::class, 'source_wallet_id');
    }

    public function receivedTransactions()
    {
        return $this->hasMany(Transaction::class, 'destination_wallet_id');
    }

    public function escrowHold()
    {
        return $this->hasOne(EscrowHold::class);
    }
}
