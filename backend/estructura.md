.
├── Dockerfile
├── README.md
├── dist
│   ├── src
│   │   ├── app.controller.d.ts
│   │   ├── app.controller.js
│   │   ├── app.controller.js.map
│   │   ├── app.module.d.ts
│   │   ├── app.module.js
│   │   ├── app.module.js.map
│   │   ├── app.service.d.ts
│   │   ├── app.service.js
│   │   ├── app.service.js.map
│   │   ├── auth
│   │   │   ├── auth.controller.d.ts
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.controller.js.map
│   │   │   ├── auth.module.d.ts
│   │   │   ├── auth.module.js
│   │   │   ├── auth.module.js.map
│   │   │   ├── auth.service.d.ts
│   │   │   ├── auth.service.js
│   │   │   ├── auth.service.js.map
│   │   │   ├── dto
│   │   │   │   ├── login.dto.d.ts
│   │   │   │   ├── login.dto.js
│   │   │   │   ├── login.dto.js.map
│   │   │   │   ├── reset-password-confirm.dto.d.ts
│   │   │   │   ├── reset-password-confirm.dto.js
│   │   │   │   └── reset-password-confirm.dto.js.map
│   │   │   ├── jwt-auth.guard.d.ts
│   │   │   ├── jwt-auth.guard.js
│   │   │   ├── jwt-auth.guard.js.map
│   │   │   ├── jwt.strategy.d.ts
│   │   │   ├── jwt.strategy.js
│   │   │   └── jwt.strategy.js.map
│   │   ├── common
│   │   │   ├── decorators
│   │   │   │   ├── permissions.decorator.d.ts
│   │   │   │   ├── permissions.decorator.js
│   │   │   │   └── permissions.decorator.js.map
│   │   │   ├── filters
│   │   │   │   ├── http-exception.filter.d.ts
│   │   │   │   ├── http-exception.filter.js
│   │   │   │   └── http-exception.filter.js.map
│   │   │   └── guards
│   │   │       ├── permissions.guard.d.ts
│   │   │       ├── permissions.guard.js
│   │   │       ├── permissions.guard.js.map
│   │   │       ├── roles.guard.d.ts
│   │   │       ├── roles.guard.js
│   │   │       └── roles.guard.js.map
│   │   ├── database
│   │   │   ├── database.module.d.ts
│   │   │   ├── database.module.js
│   │   │   └── database.module.js.map
│   │   ├── mail
│   │   │   ├── dto
│   │   │   │   ├── forgot-password.dto.d.ts
│   │   │   │   ├── forgot-password.dto.js
│   │   │   │   └── forgot-password.dto.js.map
│   │   │   ├── mail.module.d.ts
│   │   │   ├── mail.module.js
│   │   │   ├── mail.module.js.map
│   │   │   ├── mail.service.d.ts
│   │   │   ├── mail.service.js
│   │   │   └── mail.service.js.map
│   │   ├── main.d.ts
│   │   ├── main.js
│   │   ├── main.js.map
│   │   ├── permissions
│   │   │   ├── dto
│   │   │   │   ├── create-permission.dto.d.ts
│   │   │   │   ├── create-permission.dto.js
│   │   │   │   ├── create-permission.dto.js.map
│   │   │   │   ├── update-permission.dto.d.ts
│   │   │   │   ├── update-permission.dto.js
│   │   │   │   └── update-permission.dto.js.map
│   │   │   ├── permissions.controller.d.ts
│   │   │   ├── permissions.controller.js
│   │   │   ├── permissions.controller.js.map
│   │   │   ├── permissions.module.d.ts
│   │   │   ├── permissions.module.js
│   │   │   └── permissions.module.js.map
│   │   ├── profile
│   │   │   ├── profile.controller.d.ts
│   │   │   ├── profile.controller.js
│   │   │   ├── profile.controller.js.map
│   │   │   ├── profile.module.d.ts
│   │   │   ├── profile.module.js
│   │   │   └── profile.module.js.map
│   │   ├── roles
│   │   │   ├── dto
│   │   │   │   ├── create-role.dto.d.ts
│   │   │   │   ├── create-role.dto.js
│   │   │   │   ├── create-role.dto.js.map
│   │   │   │   ├── update-role.dto.d.ts
│   │   │   │   ├── update-role.dto.js
│   │   │   │   └── update-role.dto.js.map
│   │   │   ├── roles.controller.d.ts
│   │   │   ├── roles.controller.js
│   │   │   ├── roles.controller.js.map
│   │   │   ├── roles.module.d.ts
│   │   │   ├── roles.module.js
│   │   │   ├── roles.module.js.map
│   │   │   ├── roles.service.d.ts
│   │   │   ├── roles.service.js
│   │   │   └── roles.service.js.map
│   │   └── users
│   │       ├── bootstrap-admin.service.d.ts
│   │       ├── bootstrap-admin.service.js
│   │       ├── bootstrap-admin.service.js.map
│   │       ├── dto
│   │       │   ├── create-user.dto.d.ts
│   │       │   ├── create-user.dto.js
│   │       │   ├── create-user.dto.js.map
│   │       │   ├── update-user.dto.d.ts
│   │       │   ├── update-user.dto.js
│   │       │   └── update-user.dto.js.map
│   │       ├── entities
│   │       │   ├── user.entity.d.ts
│   │       │   ├── user.entity.js
│   │       │   └── user.entity.js.map
│   │       ├── users.controller.d.ts
│   │       ├── users.controller.js
│   │       ├── users.controller.js.map
│   │       ├── users.module.d.ts
│   │       ├── users.module.js
│   │       ├── users.module.js.map
│   │       ├── users.service.d.ts
│   │       ├── users.service.js
│   │       └── users.service.js.map
│   ├── tsconfig.build.tsbuildinfo
│   ├── update-admin-passwords.d.ts
│   ├── update-admin-passwords.js
│   └── update-admin-passwords.js.map
├── eslint.config.mjs
├── estructura.md
├── nest-cli.json
├── package-lock.json
├── package.json
├── src
│   ├── app.controller.spec.ts
│   ├── app.controller.ts
│   ├── app.module.ts
│   ├── app.service.ts
│   ├── auth
│   │   ├── auth.controller.spec.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   ├── auth.service.spec.ts
│   │   ├── auth.service.ts
│   │   ├── dto
│   │   │   ├── login.dto.ts
│   │   │   └── reset-password-confirm.dto.ts
│   │   ├── jwt-auth.guard.ts
│   │   └── jwt.strategy.ts
│   ├── common
│   │   ├── decorators
│   │   │   └── permissions.decorator.ts
│   │   ├── filters
│   │   │   └── http-exception.filter.ts
│   │   └── guards
│   │       ├── permissions.guard.ts
│   │       └── roles.guard.ts
│   ├── database
│   │   └── database.module.ts
│   ├── mail
│   │   ├── dto
│   │   │   └── forgot-password.dto.ts
│   │   ├── mail.module.ts
│   │   └── mail.service.ts
│   ├── main.ts
│   ├── permissions
│   │   ├── dto
│   │   │   ├── create-permission.dto.ts
│   │   │   └── update-permission.dto.ts
│   │   ├── permissions.controller.ts
│   │   └── permissions.module.ts
│   ├── profile
│   │   ├── profile.controller.ts
│   │   └── profile.module.ts
│   ├── roles
│   │   ├── dto
│   │   │   ├── create-role.dto.ts
│   │   │   └── update-role.dto.ts
│   │   ├── roles.controller.ts
│   │   ├── roles.module.ts
│   │   └── roles.service.ts
│   └── users
│       ├── bootstrap-admin.service.ts
│       ├── dto
│       │   ├── create-user.dto.ts
│       │   └── update-user.dto.ts
│       ├── entities
│       │   └── user.entity.ts
│       ├── users.controller.spec.ts
│       ├── users.controller.ts
│       ├── users.module.ts
│       ├── users.service.spec.ts
│       └── users.service.ts
├── test
│   ├── README.md
│   ├── app.e2e-spec.ts
│   ├── auth.e2e-spec.ts
│   ├── jest-e2e.json
│   ├── profile.e2e-spec.ts
│   ├── setup-e2e.ts
│   └── users.e2e-spec.ts
├── tsconfig.build.json
├── tsconfig.json
├── update-admin-passwords.ts
└── wait-for-sqlserver.sh

39 directories, 175 files
