<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class DeviceFingerprint extends Model
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = ['user_id', 'fingerprint', 'user_agent', 'last_seen_ip', 'trusted', 'created_at', 'last_seen_at'];

    protected function casts(): array
    {
        return [
            'trusted' => 'boolean',
            'created_at' => 'datetime',
            'last_seen_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
