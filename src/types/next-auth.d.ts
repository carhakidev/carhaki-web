import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string | null;
    isVerified: boolean;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      firstName: string;
      lastName: string;
      phoneNumber?: string | null;
      isVerified: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string | null;
    isVerified: boolean;
  }
}
