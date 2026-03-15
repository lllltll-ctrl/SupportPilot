import { NextRequest } from 'next/server';
import { customerRepository } from '@/lib/db/repositories/customer.repository';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (email) {
      const customer = await customerRepository.findByEmail(email);
      if (!customer) {
        return Response.json({ error: 'Customer not found' }, { status: 404 });
      }
      return Response.json({ customer });
    }

    const customers = await customerRepository.findAll();
    return Response.json({ customers });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
