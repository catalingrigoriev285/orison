<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

use function Laravel\Prompts\password;

#[Signature('status:create-admin {email : Email address used to log in} {--name= : Display name}')]
#[Description('Create an administrator account for the status panel')]
class CreateAdmin extends Command
{
    public function handle(): int
    {
        $email = (string) $this->argument('email');
        $name = (string) ($this->option('name') ?: str($email)->before('@')->headline());

        $password = password(
            label: 'Password',
            required: true,
            validate: fn (string $value) => Validator::make(['password' => $value], ['password' => Password::default()])->errors()->first(),
        );

        $validator = Validator::make(['email' => $email], ['email' => ['required', 'email', 'unique:users,email']]);

        if ($validator->fails()) {
            $this->components->error($validator->errors()->first());

            return self::FAILURE;
        }

        $user = User::create(['name' => $name, 'email' => $email, 'password' => $password]);
        $user->forceFill(['email_verified_at' => now()])->save();

        $this->components->info("Administrator {$email} created.");

        return self::SUCCESS;
    }
}
