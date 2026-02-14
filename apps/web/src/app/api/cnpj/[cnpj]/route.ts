import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

interface BrasilApiCnpjResponse {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  ddd_telefone_1: string;
  email: string;
}

async function resolveParams(params: Promise<{ cnpj: string }> | { cnpj: string }) {
  return await params;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ cnpj: string }> | { cnpj: string } }
) {
  // Auth check - any logged-in user can query CNPJ
  const authClient = createClient(await cookies());
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { cnpj } = await resolveParams(context.params);

  // Strip non-numeric characters
  const cnpjClean = cnpj.replace(/\D/g, '');

  if (cnpjClean.length !== 14) {
    return NextResponse.json({ error: 'CNPJ deve ter 14 digitos' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjClean}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 86400 }, // cache 24h
    });

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ error: 'CNPJ nao encontrado' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Erro ao consultar CNPJ' }, { status: 502 });
    }

    const data = (await res.json()) as BrasilApiCnpjResponse;

    // Format phone: ddd_telefone_1 comes as "1133334444"
    let telefone = '';
    if (data.ddd_telefone_1) {
      const digits = data.ddd_telefone_1.replace(/\D/g, '');
      if (digits.length >= 10) {
        telefone = `(${digits.slice(0, 2)}) ${digits.slice(2, digits.length - 4)}-${digits.slice(-4)}`;
      }
    }

    return NextResponse.json({
      data: {
        razao_social: data.razao_social || '',
        nome_fantasia: data.nome_fantasia || '',
        endereco: data.logradouro || '',
        numero: data.numero || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        cidade: data.municipio || '',
        estado: data.uf || '',
        cep: data.cep ? data.cep.replace(/\D/g, '') : '',
        telefone,
        email: data.email || '',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Falha na consulta do CNPJ' }, { status: 502 });
  }
}
