<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class CryptoHolding extends Model
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['user_id', 'symbol', 'quantity'];

    protected function casts(): array
    {
        return ['quantity' => 'decimal:8'];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
