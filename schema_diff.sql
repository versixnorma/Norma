alter table "public"."assembleia_comentarios" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."contatos_invalidos" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."murais_gerados" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."notificacoes_cascade" alter column "id" set default extensions.uuid_generate_v4();



