<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class FxRate extends Model
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = ['base_currency', 'quote_currency', 'rate', 'spread_pct', 'source', 'fetched_at'];

    protected function casts(): array
    {
        return [
            'rate' => 'decimal:8',
            'spread_pct' => 'decimal:2',
            'fetched_at' => 'datetime',
        ];
    }
}
