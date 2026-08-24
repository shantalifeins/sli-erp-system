import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function testMagic() {
  const email = 'natasha.parvez@shantalife.com';
  
  // 1. Generate Link
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: email
  });
  
  if (linkError) {
    return console.error('generateLink error:', linkError);
  }
  
  console.log('Link generated:', linkData.properties);
  
  const otp = linkData.properties?.email_otp;
  const vType = linkData.properties?.verification_type;
  
  if (!otp) {
    return console.error('No email_otp found in properties!');
  }
  
  // 2. Verify OTP to get session
  const { data: verifyData, error: verifyError } = await supabaseAdmin.auth.verifyOtp({
    email,
    token: otp,
    type: vType as any
  });
  
  if (verifyError) {
    return console.error('verifyOtp error:', verifyError);
  }
  
  console.log('Session acquired successfully!', verifyData.session?.access_token.substring(0, 20) + '...');
}

testMagic();
