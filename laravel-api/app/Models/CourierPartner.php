<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class CourierPartner extends Model
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['code', 'name', 'api_endpoint', 'api_key', 'supported_countries', 'supported_methods', 'active'];

    protected $hidden = ['api_key'];

    protected function casts(): array
    {
        return [
            'supported_countries' => 'array',
            'supported_methods' => 'array',
            'active' => 'boolean',
        ];
    }

    public function shipments()
    {
        return $this->hasMany(Shipment::class);
    }
}
