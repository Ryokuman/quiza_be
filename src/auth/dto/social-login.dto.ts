export type SocialAuthProvider = 'google' | 'apple' | 'kakao';

export interface ISocialLogin {
  provider: SocialAuthProvider;
  token: string;
}
