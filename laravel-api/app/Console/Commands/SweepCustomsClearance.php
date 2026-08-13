<?php

namespace App\Console\Commands;

use App\Services\ShipmentService;
use Illuminate\Console\Command;

class SweepCustomsClearance extends Command
{
    protected $signature = 'obapay:sweep-customs-clearance';

    protected $description = 'Clears any shipment whose simulated customs delay has elapsed (durable replacement for an in-process timer).';

    public function handle(ShipmentService $shipmentService): int
    {
        $shipmentService->sweepCustomsClearance();

        return self::SUCCESS;
    }
}
