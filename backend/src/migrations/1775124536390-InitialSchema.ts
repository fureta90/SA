import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1775124536390 implements MigrationInterface {
    name = 'InitialSchema1775124536390'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "permissions" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_920331560282b8bd21bb02290df" DEFAULT NEWSEQUENTIALID(), "name" nvarchar(255) NOT NULL, "description" nvarchar(255), CONSTRAINT "UQ_48ce552495d14eae9b187bb6716" UNIQUE ("name"), CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "roles" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_c1433d71a4838793a49dcad46ab" DEFAULT NEWSEQUENTIALID(), "name" nvarchar(255) NOT NULL, "description" nvarchar(255), CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_a3ffb1c0c8416b9fc6f907b7433" DEFAULT NEWSEQUENTIALID(), "email" nvarchar(255) NOT NULL, "password" nvarchar(255) NOT NULL, "firstName" nvarchar(255), "lastName" nvarchar(255), "empresa" nvarchar(255), "usuario" nvarchar(255), "photoUrl" nvarchar(MAX), "isActive" bit NOT NULL CONSTRAINT "DF_409a0298fdd86a6495e23c25c66" DEFAULT 1, "pricePerMinute" float, "globalMinutesLimit" int, "periodStartDate" datetime, "periodDays" int NOT NULL CONSTRAINT "DF_9843541869830df835209ffe8ba" DEFAULT 30, "createdAt" datetime2 NOT NULL CONSTRAINT "DF_204e9b624861ff4a5b268192101" DEFAULT getdate(), "updatedAt" datetime2 NOT NULL CONSTRAINT "DF_0f5cbe00928ba4489cc7312573b" DEFAULT getdate(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_f06f84f3f2bc0696d00882fcfa9" UNIQUE ("usuario"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_permissions" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_01f4295968ba33d73926684264f" DEFAULT NEWSEQUENTIALID(), "user_id" uniqueidentifier, "permission_id" uniqueidentifier, CONSTRAINT "PK_01f4295968ba33d73926684264f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "campaign_users" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_cb2e5605290e9945c1761258ea4" DEFAULT NEWSEQUENTIALID(), "createdAt" datetime2 NOT NULL CONSTRAINT "DF_6fead3739e4ede1e4af59a8a960" DEFAULT getdate(), "campaign_id" uniqueidentifier, "user_id" uniqueidentifier, CONSTRAINT "UQ_cbbd6a190fcb1a5c6fe94956412" UNIQUE ("campaign_id", "user_id"), CONSTRAINT "PK_cb2e5605290e9945c1761258ea4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "campaigns" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_831e3fcd4fc45b4e4c3f57a9ee4" DEFAULT NEWSEQUENTIALID(), "name" nvarchar(255) NOT NULL, "prompt" nvarchar(MAX), "createdAt" datetime2 NOT NULL CONSTRAINT "DF_47113408609b94df6b7f29f37cf" DEFAULT getdate(), "updatedAt" datetime2 NOT NULL CONSTRAINT "DF_1efde4a9dfafffaa07853340744" DEFAULT getdate(), "imageUrl" nvarchar(MAX), "isActive" bit NOT NULL CONSTRAINT "DF_7d535b2b468725adde5de3d0da0" DEFAULT 1, "minutesLimitEnabled" bit NOT NULL CONSTRAINT "DF_1878f4d7dd27d22ce6071c98ebf" DEFAULT 0, "minutesLimit" int, "minutesConsumed" float NOT NULL CONSTRAINT "DF_6ee3c6cecb82f48645936eb48a1" DEFAULT 0, "inactivatedByLimit" bit NOT NULL CONSTRAINT "DF_cfdaf83e87f6cb84d2e32349867" DEFAULT 0, "pricePerMinute" float, "periodStartDate" datetime, "periodDays" int NOT NULL CONSTRAINT "DF_ec1a1e4971176769fa8e5c45798" DEFAULT 30, CONSTRAINT "UQ_d32021d5791ed1617efaf1ac688" UNIQUE ("name"), CONSTRAINT "PK_831e3fcd4fc45b4e4c3f57a9ee4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "indicators" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_6e24383c110600564187e92042e" DEFAULT NEWSEQUENTIALID(), "INDICADOR" nvarchar(255) NOT NULL, "Puntaje_Si_Hace" float NOT NULL, "Puntaje_No_Hace" float NOT NULL, "descripcion" nvarchar(MAX), "condicion" nvarchar(255), "campaignId" uniqueidentifier, CONSTRAINT "PK_6e24383c110600564187e92042e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "calls" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_d9171d91f8dd1a649659f1b6a20" DEFAULT NEWSEQUENTIALID(), "campaignId" uniqueidentifier NOT NULL, "nombreGrabacion" nvarchar(255) NOT NULL, "usuarioLlamada" nvarchar(255), "fechaInicioLlamada" datetime, "fechaFinLlamada" datetime, "tipoLlamada" nvarchar(20), "idLlamada" nvarchar(255), "idContacto" nvarchar(255), "duracionSegundos" int, "audioTempPath" nvarchar(500), "audioUri" nvarchar(500), "callId" nvarchar(255), "analysisJobId" nvarchar(255), "analysisResult" nvarchar(MAX), "scoreTotal" float, "scoreMax" float, "indOk" int, "indTotal" int, "errorMessage" nvarchar(MAX), "status" nvarchar(50) NOT NULL CONSTRAINT "DF_3449b34195836b85705f2c1ab9c" DEFAULT 'PENDING', "retryCount" int NOT NULL CONSTRAINT "DF_37e5ace2f4e142f25e698960b5f" DEFAULT 0, "auditadoPorNombre" nvarchar(200), "auditadoPorUserId" uniqueidentifier, "auditadoAt" datetime, "createdAt" datetime2 NOT NULL CONSTRAINT "DF_912be8f298ace43ae2114dcff26" DEFAULT getdate(), "updatedAt" datetime2 NOT NULL CONSTRAINT "DF_f64fd0beaafbdae46f2c4dbd575" DEFAULT getdate(), CONSTRAINT "UQ_d3bb614b620bf52dcbf1929e5e5" UNIQUE ("campaignId", "nombreGrabacion"), CONSTRAINT "PK_d9171d91f8dd1a649659f1b6a20" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "call_indicator_reviews" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_2dde306339d07a3612adce340e6" DEFAULT NEWSEQUENTIALID(), "callId" uniqueidentifier NOT NULL, "indicadorIndex" int NOT NULL, "indicadorNombre" nvarchar(500) NOT NULL, "valorAnteriorCumple" bit, "valorAnteriorPuntaje" decimal(5,2), "valorNuevoCumple" bit NOT NULL, "valorNuevoPuntaje" decimal(5,2) NOT NULL, "nota" nvarchar(MAX), "revisadoPorUserId" uniqueidentifier NOT NULL, "revisadoPorNombre" nvarchar(200) NOT NULL, "createdAt" datetime2 NOT NULL CONSTRAINT "DF_a9df64ffd7c576247ec6291b5cd" DEFAULT getdate(), CONSTRAINT "PK_2dde306339d07a3612adce340e6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "analysis_usage" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_3a9ab6455ceea09dc50619cc01a" DEFAULT NEWSEQUENTIALID(), "campaignId" uniqueidentifier, "callId" uniqueidentifier, "callNombreGrabacion" nvarchar(255), "jobId" nvarchar(255) NOT NULL, "intentoNumero" int NOT NULL CONSTRAINT "DF_f66590acc096e23181575606faa" DEFAULT 1, "duracionSegundos" float, "duracionMinutos" float, "promptTokens" int, "candidatesTokens" int, "totalTokens" int, "costoUsd" float, "costoDetalle" nvarchar(MAX), "modelo" nvarchar(100), "createdAt" datetime2 NOT NULL CONSTRAINT "DF_3de9dd81cbcebc174ab523f4430" DEFAULT getdate(), CONSTRAINT "PK_3a9ab6455ceea09dc50619cc01a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "role_permissions" ("role_id" uniqueidentifier NOT NULL, "permission_id" uniqueidentifier NOT NULL, CONSTRAINT "PK_25d24010f53bb80b78e412c9656" PRIMARY KEY ("role_id", "permission_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_178199805b901ccd220ab7740e" ON "role_permissions" ("role_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_17022daf3f885f7d35423e9971" ON "role_permissions" ("permission_id") `);
        await queryRunner.query(`CREATE TABLE "user_roles" ("user_id" uniqueidentifier NOT NULL, "role_id" uniqueidentifier NOT NULL, CONSTRAINT "PK_23ed6f04fe43066df08379fd034" PRIMARY KEY ("user_id", "role_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_87b8888186ca9769c960e92687" ON "user_roles" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_b23c65e50a758245a33ee35fda" ON "user_roles" ("role_id") `);
        await queryRunner.query(`ALTER TABLE "user_permissions" ADD CONSTRAINT "FK_3495bd31f1862d02931e8e8d2e8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_permissions" ADD CONSTRAINT "FK_8145f5fadacd311693c15e41f10" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "campaign_users" ADD CONSTRAINT "FK_7b3a130aca1acc8c33b9d0ca898" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "campaign_users" ADD CONSTRAINT "FK_ca187e243c63a78352e7a37ff67" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "indicators" ADD CONSTRAINT "FK_f4b91f131cab4a6cd0c64cf92f0" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "calls" ADD CONSTRAINT "FK_fa7572c103b6e75d43eb8fe0c22" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "call_indicator_reviews" ADD CONSTRAINT "FK_ececbb6fa5f1a99c628714acd22" FOREIGN KEY ("callId") REFERENCES "calls"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "analysis_usage" ADD CONSTRAINT "FK_38dcb0db0eab1ec62414d9627ed" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_17022daf3f885f7d35423e9971e" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_roles" ADD CONSTRAINT "FK_87b8888186ca9769c960e926870" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "user_roles" ADD CONSTRAINT "FK_b23c65e50a758245a33ee35fda1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_roles" DROP CONSTRAINT "FK_b23c65e50a758245a33ee35fda1"`);
        await queryRunner.query(`ALTER TABLE "user_roles" DROP CONSTRAINT "FK_87b8888186ca9769c960e926870"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_17022daf3f885f7d35423e9971e"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_178199805b901ccd220ab7740ec"`);
        await queryRunner.query(`ALTER TABLE "analysis_usage" DROP CONSTRAINT "FK_38dcb0db0eab1ec62414d9627ed"`);
        await queryRunner.query(`ALTER TABLE "call_indicator_reviews" DROP CONSTRAINT "FK_ececbb6fa5f1a99c628714acd22"`);
        await queryRunner.query(`ALTER TABLE "calls" DROP CONSTRAINT "FK_fa7572c103b6e75d43eb8fe0c22"`);
        await queryRunner.query(`ALTER TABLE "indicators" DROP CONSTRAINT "FK_f4b91f131cab4a6cd0c64cf92f0"`);
        await queryRunner.query(`ALTER TABLE "campaign_users" DROP CONSTRAINT "FK_ca187e243c63a78352e7a37ff67"`);
        await queryRunner.query(`ALTER TABLE "campaign_users" DROP CONSTRAINT "FK_7b3a130aca1acc8c33b9d0ca898"`);
        await queryRunner.query(`ALTER TABLE "user_permissions" DROP CONSTRAINT "FK_8145f5fadacd311693c15e41f10"`);
        await queryRunner.query(`ALTER TABLE "user_permissions" DROP CONSTRAINT "FK_3495bd31f1862d02931e8e8d2e8"`);
        await queryRunner.query(`DROP INDEX "IDX_b23c65e50a758245a33ee35fda" ON "user_roles"`);
        await queryRunner.query(`DROP INDEX "IDX_87b8888186ca9769c960e92687" ON "user_roles"`);
        await queryRunner.query(`DROP TABLE "user_roles"`);
        await queryRunner.query(`DROP INDEX "IDX_17022daf3f885f7d35423e9971" ON "role_permissions"`);
        await queryRunner.query(`DROP INDEX "IDX_178199805b901ccd220ab7740e" ON "role_permissions"`);
        await queryRunner.query(`DROP TABLE "role_permissions"`);
        await queryRunner.query(`DROP TABLE "analysis_usage"`);
        await queryRunner.query(`DROP TABLE "call_indicator_reviews"`);
        await queryRunner.query(`DROP TABLE "calls"`);
        await queryRunner.query(`DROP TABLE "indicators"`);
        await queryRunner.query(`DROP TABLE "campaigns"`);
        await queryRunner.query(`DROP TABLE "campaign_users"`);
        await queryRunner.query(`DROP TABLE "user_permissions"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "roles"`);
        await queryRunner.query(`DROP TABLE "permissions"`);
    }

}
