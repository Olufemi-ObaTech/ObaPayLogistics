<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class IdempotencyRecord extends Model
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = ['key', 'user_id', 'request_path', 'response_body', 'status_code', 'locked_at', 'completed_at'];

    protected function casts(): array
    {
        return [
            'response_body' => 'array',
            'locked_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }
}
