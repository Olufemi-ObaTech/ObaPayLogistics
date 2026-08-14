<?php

namespace App\Http\Controllers;

use App\Models\CustomsDocument;
use App\Models\Shipment;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

/**
 * Operational oversight for ADMIN/SUPERADMIN users only (see EnsureAdmin
 * middleware). Read access to everything on the platform, plus the specific
 * write actions a support/ops team actually needs (suspend accounts, adjust
 * FX rates) — deliberately not exposing raw wallet balance edits or the
 * ability to move funds, since that would bypass the transaction ledger.
 */
class AdminController extends Controller
{
    public function stats()
    {
        $usersByStatus = User::query()->selectRaw('status, count(*) as count')->groupBy('status')->pluck('count', 'status');
        $walletsByCurrency = Wallet::query()->selectRaw('currency, sum(balance) as total, sum(held_balance) as held')->groupBy('currency')->get();
        $shipmentsByStatus = Shipment::query()->selectRaw('status, count(*) as count')->groupBy('status')->pluck('count', 'status');
        $revenueByCurrency = Transaction::query()
            ->where('status', 'COMPLETED')
            ->selectRaw('currency, sum(fee_amount) as fees, sum(fx_spread_amount) as fx_spread')
            ->groupBy('currency')
            ->get();

        return [
            'totalUsers' => User::query()->count(),
            'usersByStatus' => $usersByStatus,
            'totalShipments' => Shipment::query()->count(),
            'shipmentsByStatus' => $shipmentsByStatus,
            'totalTransactions' => Transaction::query()->count(),
            'walletsByCurrency' => $walletsByCurrency,
            'revenueByCurrency' => $revenueByCurrency,
            'pendingDocumentReviews' => CustomsDocument::query()->where('verification_status', 'PENDING')->count(),
        ];
    }

    public function users(Request $request)
    {
        $query = User::query()->withCount(['wallets', 'shipments']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%");
            });
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return $query->orderByDesc('created_at')->paginate(25);
    }

    public function showUser(string $id)
    {
        $user = User::query()->with('wallets')->findOrFail($id);
        $recentTransactions = Transaction::query()
            ->whereIn('source_wallet_id', $user->wallets->pluck('id'))
            ->orWhereIn('destination_wallet_id', $user->wallets->pluck('id'))
            ->orderByDesc('created_at')->limit(20)->get();

        return [
            'user' => $user,
            'recentTransactions' => $recentTransactions,
            'shipmentCount' => Shipment::query()->where('user_id', $id)->count(),
        ];
    }

    public function updateUserStatus(Request $request, string $id)
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'CLOSED'])],
        ]);

        $user = User::query()->findOrFail($id);
        if ($user->isAdmin()) {
            throw new BadRequestHttpException('Use the Team page to manage admin accounts');
        }

        $user->update(['status' => $data['status']]);
        logger()->info('admin_user_status_changed', ['adminId' => $request->user()->id, 'targetUserId' => $id, 'status' => $data['status']]);

        return $user;
    }

    public function transactions(Request $request)
    {
        $query = Transaction::query();
        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return $query->orderByDesc('created_at')->paginate(25);
    }

    public function shipments(Request $request)
    {
        $query = Shipment::query()->with(['user:id,first_name,last_name,email', 'courierPartner:id,code,name']);
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return $query->orderByDesc('created_at')->paginate(25);
    }

    public function fxRates()
    {
        return \App\Models\FxRate::query()->orderBy('base_currency')->orderBy('quote_currency')->get();
    }

    public function upsertFxRate(Request $request)
    {
        $data = $request->validate([
            'baseCurrency' => ['required', 'string', 'size:3'],
            'quoteCurrency' => ['required', 'string', 'size:3'],
            'rate' => ['required', 'numeric', 'gt:0'],
        ]);

        $rate = \App\Models\FxRate::query()->updateOrCreate(
            ['base_currency' => strtoupper($data['baseCurrency']), 'quote_currency' => strtoupper($data['quoteCurrency'])],
            ['rate' => $data['rate'], 'source' => 'admin', 'fetched_at' => now()],
        );

        logger()->info('admin_fx_rate_updated', ['adminId' => $request->user()->id, 'pair' => "{$data['baseCurrency']}->{$data['quoteCurrency']}", 'rate' => $data['rate']]);

        return $rate;
    }

    // --- SUPERADMIN only (see EnsureSuperAdmin middleware) ---

    public function team()
    {
        return User::query()->whereIn('role', ['ADMIN', 'SUPERADMIN'])->orderBy('role')->get();
    }

    public function promote(Request $request, string $id)
    {
        $user = User::query()->findOrFail($id);
        if ($user->role !== 'USER') {
            throw new BadRequestHttpException('User is already staff');
        }

        $user->update(['role' => 'ADMIN']);
        logger()->warning('admin_promoted', ['byId' => $request->user()->id, 'userId' => $id]);

        return $user;
    }

    public function demote(Request $request, string $id)
    {
        $user = User::query()->findOrFail($id);
        if ($user->role === 'SUPERADMIN') {
            throw new BadRequestHttpException('Cannot demote a super admin from here');
        }
        if ($user->id === $request->user()->id) {
            throw new BadRequestHttpException('Cannot demote yourself');
        }

        $user->update(['role' => 'USER']);
        logger()->warning('admin_demoted', ['byId' => $request->user()->id, 'userId' => $id]);

        return $user;
    }
}
