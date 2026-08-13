<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'email' => fake()->unique()->safeEmail(),
            'phone' => '+234'.fake()->unique()->numerify('##########'),
            'password_hash' => static::$password ??= Hash::make('password12345'),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'country' => fake()->randomElement(['NG', 'KE', 'ZA', 'GH']),
            'preferred_currency' => 'USD',
            'status' => 'ACTIVE',
        ];
    }
}
