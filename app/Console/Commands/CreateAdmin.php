<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use Symfony\Component\Console\Input\StreamableInputInterface;

use function Laravel\Prompts\password;

#[Signature('status:create-admin {email : Email address used to log in} {--name= : Display name} {--password-stdin : Read the password from standard input instead of prompting}')]
#[Description('Create an administrator account for the status panel')]
class CreateAdmin extends Command
{
    public function handle(): int
    {
        $email = (string) $this->argument('email');
        $name = (string) ($this->option('name') ?: str($email)->before('@')->headline());
        $fromStdin = (bool) $this->option('password-stdin');

        $password = $fromStdin ? $this->readPasswordFromStdin() : password(
            label: 'Password',
            required: true,
            validate: fn (string $value) => Validator::make(['password' => $value], ['password' => Password::default()])->errors()->first(),
        );

        $rules = ['email' => ['required', 'email', 'unique:users,email']];

        // The prompt validates the password as it is typed; stdin input has not been checked yet.
        if ($fromStdin) {
            $rules['password'] = ['required', 'string', Password::default()];
        }

        $validator = Validator::make(['email' => $email, 'password' => $password], $rules);

        if ($validator->fails()) {
            $this->components->error($validator->errors()->first());

            return self::FAILURE;
        }

        $user = User::create(['name' => $name, 'email' => $email, 'password' => $password]);
        $user->forceFill(['email_verified_at' => now()])->save();

        $this->components->info("Administrator {$email} created.");

        return self::SUCCESS;
    }

    /**
     * Read the first line of standard input, so scripts can pass the password
     * without it showing up in the process list or shell history.
     */
    private function readPasswordFromStdin(): string
    {
        $stream = $this->input instanceof StreamableInputInterface ? $this->input->getStream() : null;

        $line = fgets($stream ?? STDIN);

        return $line === false ? '' : rtrim($line, "\r\n");
    }
}
