import { handleAuth } from '@workos-inc/authkit-nextjs';

// CU-868kfva59: intercambio code→sesión de la hosted UI. `returnPathname` por
// defecto ('/') coincide con el único destino que existe hoy en F1.
export const GET = handleAuth({ returnPathname: '/' });
