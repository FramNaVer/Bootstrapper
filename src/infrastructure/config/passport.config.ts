import passport from "passport"
import { Strategy as GoogleStrategy } from "passport-google-oauth20"
import { Strategy as GithubStrategy, Profile as GithubProfile } from "passport-github2"
import { GoogleLoginUseCase } from "../../application/use-cases/google-login.use-case"
import { GithubLoginUseCase } from "../../application/use-cases/github-login.use-case"

export function setupPassport(googleLoginUseCase: GoogleLoginUseCase) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const result = await googleLoginUseCase.execute({
            googleId: profile.id,
            email: profile.emails![0].value,
            displayName: profile.displayName,
            avatarUrl: profile.photos?.[0].value,
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
        clientID: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        callbackURL: process.env.GITHUB_CALLBACK_URL!,
        scope: ["user:email"],
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: GithubProfile,
        done: (err: unknown, user?: unknown) => void
      ) => {
        try {
          const result = await githubLoginUseCase.execute({
            githubId: profile.id,
            email: profile.emails![0].value,
            displayName: profile.displayName,
            avatarUrl: profile.photos?.[0].value,
          })
          done(null, result)
        } catch (err) {
          done(err)
        }
      }
    )
  )
}
