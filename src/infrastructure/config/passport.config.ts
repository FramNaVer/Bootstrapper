import passport from "passport"
import { Strategy as GoogleStrategy } from "passport-google-oauth20"
import { Strategy as GithubStrategy, Profile as GithubProfile } from "passport-github2"
import { GoogleLoginUseCase } from "../../application/use-cases/google-login.use-case"
import { GithubLoginUseCase } from "../../application/use-cases/github-login.use-case"
import { env } from "./env"

export function setupPassport(googleLoginUseCase: GoogleLoginUseCase) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          // อ่าน email แบบปลอดภัย: ถ้า provider ไม่ส่งมา ส่ง null ให้ use case ตัดสินใจ
          // (อย่าใช้ profile.emails![0] เพราะถ้า undefined จะ throw ก่อนถึง use case)
          const result = await googleLoginUseCase.execute({
            googleId: profile.id,
            email: profile.emails?.[0]?.value ?? null,
            emailVerified: profile._json.email_verified === true,
            displayName: profile.displayName,
            avatarUrl: profile.photos?.[0]?.value,
          })
          done(null, result)
        } catch (err) {
          done(err)
        }
      }
    )
  )
}

export function setupGithubPassport(githubLoginUseCase: GithubLoginUseCase) {
  passport.use(
    new GithubStrategy(
      {
        clientID: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        callbackURL: env.GITHUB_CALLBACK_URL,
        scope: ["user:email"],
        // ขอ raw emails เพื่อให้ได้ field `verified` และ `primary`
        // โดย default passport-github2 ส่งมาแค่ { value } ไม่มี verified
        allRawEmails: true,
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: GithubProfile,
        done: (err: unknown, user?: unknown) => void
      ) => {
        try {
          // ด้วย allRawEmails แต่ละ email จะมี { value, primary, verified }
          // เลือก primary ก่อน ถ้าไม่มีค่อย fallback เป็นตัวแรก
          const emails = (profile.emails ?? []) as Array<{
            value: string
            primary?: boolean
            verified?: boolean
          }>
          const primaryEmail = emails.find((e) => e.primary) ?? emails[0]

          const result = await githubLoginUseCase.execute({
            githubId: profile.id,
            email: primaryEmail?.value ?? null,
            emailVerified: primaryEmail?.verified === true,
            displayName: profile.displayName,
            avatarUrl: profile.photos?.[0]?.value,
          })
          done(null, result)
        } catch (err) {
          done(err)
        }
      }
    )
  )
}
