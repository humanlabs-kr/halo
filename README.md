# Receipto

## Apps

| Environment | Link | Preview |
|------------|------|---------|
| Woohyun | [Open App](https://world.org/mini-app?app_id=app_fdcdf4d4e3cea66f055b7037dc4d749c&path=&draft_id=meta_ea153ea3ef2b363146b66d5d1fa73560) | <img src="https://pub-ded5a6fc40aa4d748e265874b72c3960.r2.dev/receipto-woohyun.png" width="200"> |
| Jinwoo | [Open App](https://world.org/mini-app?app_id=app_76be0bd3098cf5abed0e2deb86880b8b&path=&draft_id=meta_637df31aa220e88761848d83560f3e29) | <img src="https://pub-ded5a6fc40aa4d748e265874b72c3960.r2.dev/receipto-jinwoo.png" width="200"> |
| Youngho | [Open App](https://world.org/mini-app?app_id=app_91cf5de01d9ea556adca1a40b2e93ac8&path=&draft_id=meta_81fe5fc414a7fa5ec5e92188d21e61bf) | <img src="https://pub-ded5a6fc40aa4d748e265874b72c3960.r2.dev/receipto-youngho.png" width="200"> |
| Staging | [Open App](https://world.org/mini-app?app_id=app_3050e705a2c22ba9480724b860f0fd21&path=&draft_id=meta_bc1ae9a2d44a0e327b803ba949f637cf) | <img src="https://pub-ded5a6fc40aa4d748e265874b72c3960.r2.dev/receipto-staging.png" width="200"> |
| Production | [Open App](https://world.org/mini-app?app_id=app_c35ac7dbe6bfaee48efa9496895a49a7&path=&draft_id=meta_0984453e80c1ce1868a68a74f7b979cf) | <img src="https://pub-ded5a6fc40aa4d748e265874b72c3960.r2.dev/receipto-production.png" width="200"> |


## How to develop

0. set `packages/000_env/.mynameis`
1. Copy given `decrypt.pem` to `packages/000_env/decrypt.pem`
2. `pnpm :env decrypt`
3. `pnpm dev`

## When applying change to env.jsonc is needed,

1. change `packages/000_env/env.jsonc` file
2. `pnpm :env refresh`
3. commit and push

## General
- - `pnpm web add lodash-es` : web 에만 lodash-es 추가

## DB

- `pnpm database kit push` : 로컬 디비에 적용
- `pnpm database kit generate` : migration dml script 생성
- git push

## 배포

- `CHECKED`

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

For more information about the MIT License, visit: https://opensource.org/licenses/MIT
