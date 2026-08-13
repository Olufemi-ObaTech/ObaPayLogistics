<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Shipment extends Model
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id', 'user_id', 'origin_address', 'destination_address', 'weight_kg', 'dimensions_cm',
        'declared_value', 'declared_value_currency', 'customs_category', 'shipping_method',
        'courier_partner_id', 'quoted_rate', 'final_price', 'price_currency', 'margin_amount',
        'tracking_number', 'status', 'customs_clear_at', 'paid_at', 'delivered_at',
    ];

    protected function casts(): array
    {
        return [
            'origin_address' => 'array',
            'destination_address' => 'array',
            'dimensions_cm' => 'array',
            'weight_kg' => 'decimal:3',
            'declared_value' => 'decimal:4',
            'quoted_rate' => 'decimal:4',
            'final_price' => 'decimal:4',
            'margin_amount' => 'decimal:4',
            'customs_clear_at' => 'datetime',
            'paid_at' => 'datetime',
            'delivered_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function courierPartner()
    {
        return $this->belongsTo(CourierPartner::class);
    }

    public function trackingEvents()
    {
        return $this->hasMany(TrackingEvent::class);
    }

    public function customsDocuments()
    {
        return $this->hasMany(CustomsDocument::class);
    }

    public function escrowHold()
    {
        return $this->hasOne(EscrowHold::class);
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }
}
