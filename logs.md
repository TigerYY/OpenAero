
🚀 OpenAero 开发服务器启动
=====================================
📋 功能: 自动清理端口 + 启动Next.js开发服务器
📍 当前工作目录: /Users/yangyang/Documents/YYCode/OpenAero/openaero.web
✅ 项目目录验证通过
🔍 检查端口 3000 状态...
⚠️  端口 3000 被进程 29693
29694 占用
✅ 成功终止进程 29693
✅ 成功终止进程 29694
✅ 端口 3000 清理成功
🚀 启动Next.js开发服务器 (端口 3000)...
   ▲ Next.js 14.1.0
   - Local:        http://localhost:3000
   - Environments: .env.local

 ✓ Ready in 1082ms
 ✓ Compiled /src/middleware in 78ms (109 modules)
 ○ Compiling / ...
 ✓ Compiled / in 3.4s (734 modules)
 ○ Compiling /[locale] ...
 ✓ Compiled /[locale] in 568ms (1573 modules)
 ✓ Compiled /manifest.webmanifest in 99ms (861 modules)
 ✓ Compiled /api/solutions in 363ms (978 modules)
[getServerUserFromRequest] 找到认证 cookies: [ 'sb-cardynuoazvaytvinxvm-auth-token' ]
[getServerUserFromRequest] 找到认证 cookies: [ 'sb-cardynuoazvaytvinxvm-auth-token' ]
[getServerUserFromRequest] 获取用户失败: Auth session missing!
[authenticateRequest] 未找到用户，extendedUser: null
[getServerUserFromRequest] 找到认证 cookies: [ 'sb-cardynuoazvaytvinxvm-auth-token' ]
[getServerUserFromRequest] 获取用户失败: Auth session missing!
[authenticateRequest] 未找到用户，extendedUser: null
[getServerUserFromRequest] 找到认证 cookies: [ 'sb-cardynuoazvaytvinxvm-auth-token' ]
[getServerUserFromRequest] 获取用户失败: Auth session missing!
[authenticateRequest] 直接获取用户也失败
[getServerUserFromRequest] 获取用户失败: Auth session missing!
[authenticateRequest] 直接获取用户也失败
获取方案列表失败: PrismaClientKnownRequestError: 
Invalid `prisma.solution.findMany()` invocation:


The column `solutions.category` does not exist in the current database.
    at $n.handleRequestError (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/@prisma/client/runtime/library.js:121:7315)
    at $n.handleAndLogRequestError (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/@prisma/client/runtime/library.js:121:6623)
    at $n.request (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/@prisma/client/runtime/library.js:121:6307)
    at async l (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/@prisma/client/runtime/library.js:130:9633)
    at async GET (webpack-internal:///(rsc)/./src/app/api/solutions/route.ts:65:27)
    at async /Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/compiled/next-server/app-route.runtime.dev.js:6:63809
    at async eU.execute (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/compiled/next-server/app-route.runtime.dev.js:6:53964)
    at async eU.handle (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/compiled/next-server/app-route.runtime.dev.js:6:65062)
    at async doRender (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1333:42)
    at async cacheEntry.responseCache.get.routeKind (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1555:28)
    at async DevServer.renderToResponseWithComponentsImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1463:28)
    at async DevServer.renderPageComponent (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1856:24)
    at async DevServer.renderToResponseImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1894:32)
    at async DevServer.pipeImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:911:25)
    at async NextNodeServer.handleCatchallRenderRequest (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/next-server.js:271:17)
    at async DevServer.handleRequestImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:807:17)
    at async /Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/dev/next-dev-server.js:331:20
    at async Span.traceAsyncFn (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/trace/trace.js:151:20)
    at async DevServer.handleRequest (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/dev/next-dev-server.js:328:24)
    at async invokeRender (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/lib/router-server.js:163:21)
    at async handleRequest (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/lib/router-server.js:342:24)
    at async requestHandlerImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/lib/router-server.js:366:13)
    at async Server.requestListener (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/lib/start-server.js:140:13) {
  code: 'P2022',
  clientVersion: '5.22.0',
  meta: { modelName: 'Solution', column: 'solutions.category' }
}
获取方案列表失败: PrismaClientKnownRequestError: 
Invalid `prisma.solution.findMany()` invocation:


The column `solutions.category` does not exist in the current database.
    at $n.handleRequestError (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/@prisma/client/runtime/library.js:121:7315)
    at $n.handleAndLogRequestError (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/@prisma/client/runtime/library.js:121:6623)
    at $n.request (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/@prisma/client/runtime/library.js:121:6307)
    at async l (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/@prisma/client/runtime/library.js:130:9633)
    at async GET (webpack-internal:///(rsc)/./src/app/api/solutions/route.ts:65:27)
    at async /Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/compiled/next-server/app-route.runtime.dev.js:6:63809
    at async eU.execute (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/compiled/next-server/app-route.runtime.dev.js:6:53964)
    at async eU.handle (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/compiled/next-server/app-route.runtime.dev.js:6:65062)
    at async doRender (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1333:42)
    at async cacheEntry.responseCache.get.routeKind (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1555:28)
    at async DevServer.renderToResponseWithComponentsImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1463:28)
    at async DevServer.renderPageComponent (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1856:24)
    at async DevServer.renderToResponseImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1894:32)
    at async DevServer.pipeImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:911:25)
    at async NextNodeServer.handleCatchallRenderRequest (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/next-server.js:271:17)
    at async DevServer.handleRequestImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:807:17)
    at async /Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/dev/next-dev-server.js:331:20
    at async Span.traceAsyncFn (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/trace/trace.js:151:20)
    at async DevServer.handleRequest (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/dev/next-dev-server.js:328:24)
    at async invokeRender (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/lib/router-server.js:163:21)
    at async handleRequest (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/lib/router-server.js:342:24)
    at async requestHandlerImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/lib/router-server.js:366:13)
    at async Server.requestListener (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/lib/start-server.js:140:13) {
  code: 'P2022',
  clientVersion: '5.22.0',
  meta: { modelName: 'Solution', column: 'solutions.category' }
}
[getServerUserFromRequest] 找到认证 cookies: [ 'sb-cardynuoazvaytvinxvm-auth-token' ]
[getServerUserFromRequest] 找到认证 cookies: [ 'sb-cardynuoazvaytvinxvm-auth-token' ]
[getServerUserFromRequest] 获取用户失败: Auth session missing!
[authenticateRequest] 未找到用户，extendedUser: null
[getServerUserFromRequest] 找到认证 cookies: [ 'sb-cardynuoazvaytvinxvm-auth-token' ]
[getServerUserFromRequest] 获取用户失败: Auth session missing!
[authenticateRequest] 未找到用户，extendedUser: null
[getServerUserFromRequest] 找到认证 cookies: [ 'sb-cardynuoazvaytvinxvm-auth-token' ]
[getServerUserFromRequest] 获取用户失败: Auth session missing!
[authenticateRequest] 直接获取用户也失败
[getServerUserFromRequest] 获取用户失败: Auth session missing!
[authenticateRequest] 直接获取用户也失败
 ✓ Compiled /[locale]/login in 278ms (1733 modules)
获取方案列表失败: PrismaClientKnownRequestError: 
Invalid `prisma.solution.findMany()` invocation:


The column `solutions.category` does not exist in the current database.
    at $n.handleRequestError (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/@prisma/client/runtime/library.js:121:7315)
    at $n.handleAndLogRequestError (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/@prisma/client/runtime/library.js:121:6623)
    at $n.request (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/@prisma/client/runtime/library.js:121:6307)
    at async l (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/@prisma/client/runtime/library.js:130:9633)
    at async GET (webpack-internal:///(rsc)/./src/app/api/solutions/route.ts:65:27)
    at async /Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/compiled/next-server/app-route.runtime.dev.js:6:63809
    at async eU.execute (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/compiled/next-server/app-route.runtime.dev.js:6:53964)
    at async eU.handle (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/compiled/next-server/app-route.runtime.dev.js:6:65062)
    at async doRender (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1333:42)
    at async cacheEntry.responseCache.get.routeKind (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1555:28)
    at async DevServer.renderToResponseWithComponentsImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1463:28)
    at async DevServer.renderPageComponent (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1856:24)
    at async DevServer.renderToResponseImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1894:32)
    at async DevServer.pipeImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:911:25)
    at async NextNodeServer.handleCatchallRenderRequest (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/next-server.js:271:17)
    at async DevServer.handleRequestImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:807:17)
    at async /Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/dev/next-dev-server.js:331:20
    at async Span.traceAsyncFn (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/trace/trace.js:151:20)
    at async DevServer.handleRequest (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/dev/next-dev-server.js:328:24)
    at async invokeRender (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/lib/router-server.js:163:21)
    at async handleRequest (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/lib/router-server.js:342:24)
    at async requestHandlerImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/lib/router-server.js:366:13)
    at async Server.requestListener (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/lib/start-server.js:140:13) {
  code: 'P2022',
  clientVersion: '5.22.0',
  meta: { modelName: 'Solution', column: 'solutions.category' }
}
获取方案列表失败: PrismaClientKnownRequestError: 
Invalid `prisma.solution.findMany()` invocation:


The column `solutions.category` does not exist in the current database.
    at $n.handleRequestError (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/@prisma/client/runtime/library.js:121:7315)
    at $n.handleAndLogRequestError (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/@prisma/client/runtime/library.js:121:6623)
    at $n.request (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/@prisma/client/runtime/library.js:121:6307)
    at async l (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/@prisma/client/runtime/library.js:130:9633)
    at async GET (webpack-internal:///(rsc)/./src/app/api/solutions/route.ts:65:27)
    at async /Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/compiled/next-server/app-route.runtime.dev.js:6:63809
    at async eU.execute (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/compiled/next-server/app-route.runtime.dev.js:6:53964)
    at async eU.handle (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/compiled/next-server/app-route.runtime.dev.js:6:65062)
    at async doRender (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1333:42)
    at async cacheEntry.responseCache.get.routeKind (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1555:28)
    at async DevServer.renderToResponseWithComponentsImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1463:28)
    at async DevServer.renderPageComponent (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1856:24)
    at async DevServer.renderToResponseImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1894:32)
    at async DevServer.pipeImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:911:25)
    at async NextNodeServer.handleCatchallRenderRequest (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/next-server.js:271:17)
    at async DevServer.handleRequestImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:807:17)
    at async /Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/dev/next-dev-server.js:331:20
    at async Span.traceAsyncFn (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/trace/trace.js:151:20)
    at async DevServer.handleRequest (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/dev/next-dev-server.js:328:24)
    at async invokeRender (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/lib/router-server.js:163:21)
    at async handleRequest (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/lib/router-server.js:342:24)
    at async requestHandlerImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/lib/router-server.js:366:13)
    at async Server.requestListener (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/lib/start-server.js:140:13) {
  code: 'P2022',
  clientVersion: '5.22.0',
  meta: { modelName: 'Solution', column: 'solutions.category' }
}
 ✓ Compiled /api/auth/sync-session in 73ms (987 modules)
 ✓ Compiled /api/users/me in 69ms (989 modules)
[getServerUserFromRequest] 找到认证 cookies: [ 'sb-cardynuoazvaytvinxvm-auth-token' ]
[getServerUserFromRequest] 找到认证 cookies: [ 'sb-cardynuoazvaytvinxvm-auth-token' ]
[getServerUserFromRequest] 成功获取用户: 81a361cb-d5a5-440e-8120-4ae4f2e625b4
[getServerUserFromRequest] 找到认证 cookies: [ 'sb-cardynuoazvaytvinxvm-auth-token' ]
[getServerUserFromRequest] 成功获取用户: 81a361cb-d5a5-440e-8120-4ae4f2e625b4
[getServerUserFromRequest] 找到认证 cookies: [ 'sb-cardynuoazvaytvinxvm-auth-token' ]
[getServerUserFromRequest] 成功获取用户: 81a361cb-d5a5-440e-8120-4ae4f2e625b4
[getServerUserFromRequest] 成功获取用户: 81a361cb-d5a5-440e-8120-4ae4f2e625b4
[getServerUserFromRequest] 找到认证 cookies: [ 'sb-cardynuoazvaytvinxvm-auth-token' ]
[getServerUserFromRequest] 找到认证 cookies: [ 'sb-cardynuoazvaytvinxvm-auth-token' ]
[getServerUserFromRequest] 成功获取用户: 81a361cb-d5a5-440e-8120-4ae4f2e625b4
[authenticateRequest] 认证成功: {
  userId: '81a361cb-d5a5-440e-8120-4ae4f2e625b4',
  email: 'yy13922202931@hotmail.com',
  role: 'USER'
}
[getServerUserFromRequest] 成功获取用户: 81a361cb-d5a5-440e-8120-4ae4f2e625b4
获取方案列表失败: PrismaClientKnownRequestError: 
Invalid `prisma.solution.findMany()` invocation:


The column `solutions.category` does not exist in the current database.
    at $n.handleRequestError (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/@prisma/client/runtime/library.js:121:7315)
    at $n.handleAndLogRequestError (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/@prisma/client/runtime/library.js:121:6623)
    at $n.request (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/@prisma/client/runtime/library.js:121:6307)
    at async l (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/@prisma/client/runtime/library.js:130:9633)
    at async GET (webpack-internal:///(rsc)/./src/app/api/solutions/route.ts:65:27)
    at async /Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/compiled/next-server/app-route.runtime.dev.js:6:63809
    at async eU.execute (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/compiled/next-server/app-route.runtime.dev.js:6:53964)
    at async eU.handle (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/compiled/next-server/app-route.runtime.dev.js:6:65062)
    at async doRender (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1333:42)
    at async cacheEntry.responseCache.get.routeKind (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1555:28)
    at async DevServer.renderToResponseWithComponentsImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1463:28)
    at async DevServer.renderPageComponent (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1856:24)
    at async DevServer.renderToResponseImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1894:32)
    at async DevServer.pipeImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:911:25)
    at async NextNodeServer.handleCatchallRenderRequest (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/next-server.js:271:17)
    at async DevServer.handleRequestImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:807:17)
    at async /Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/dev/next-dev-server.js:331:20
    at async Span.traceAsyncFn (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/trace/trace.js:151:20)
    at async DevServer.handleRequest (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/dev/next-dev-server.js:328:24)
    at async invokeRender (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/lib/router-server.js:163:21)
    at async handleRequest (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/lib/router-server.js:342:24)
    at async requestHandlerImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/lib/router-server.js:366:13)
    at async Server.requestListener (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/lib/start-server.js:140:13) {
  code: 'P2022',
  clientVersion: '5.22.0',
  meta: { modelName: 'Solution', column: 'solutions.category' }
}
[authenticateRequest] 认证成功: {
  userId: '81a361cb-d5a5-440e-8120-4ae4f2e625b4',
  email: 'yy13922202931@hotmail.com',
  role: 'USER'
}
获取方案列表失败: PrismaClientKnownRequestError: 
Invalid `prisma.solution.findMany()` invocation:


The column `solutions.category` does not exist in the current database.
    at $n.handleRequestError (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/@prisma/client/runtime/library.js:121:7315)
    at $n.handleAndLogRequestError (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/@prisma/client/runtime/library.js:121:6623)
    at $n.request (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/@prisma/client/runtime/library.js:121:6307)
    at async l (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/@prisma/client/runtime/library.js:130:9633)
    at async GET (webpack-internal:///(rsc)/./src/app/api/solutions/route.ts:65:27)
    at async /Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/compiled/next-server/app-route.runtime.dev.js:6:63809
    at async eU.execute (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/compiled/next-server/app-route.runtime.dev.js:6:53964)
    at async eU.handle (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/compiled/next-server/app-route.runtime.dev.js:6:65062)
    at async doRender (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1333:42)
    at async cacheEntry.responseCache.get.routeKind (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1555:28)
    at async DevServer.renderToResponseWithComponentsImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1463:28)
    at async DevServer.renderPageComponent (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1856:24)
    at async DevServer.renderToResponseImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1894:32)
    at async DevServer.pipeImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:911:25)
    at async NextNodeServer.handleCatchallRenderRequest (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/next-server.js:271:17)
    at async DevServer.handleRequestImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:807:17)
    at async /Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/dev/next-dev-server.js:331:20
    at async Span.traceAsyncFn (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/trace/trace.js:151:20)
    at async DevServer.handleRequest (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/dev/next-dev-server.js:328:24)
    at async invokeRender (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/lib/router-server.js:163:21)
    at async handleRequest (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/lib/router-server.js:342:24)
    at async requestHandlerImpl (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/lib/router-server.js:366:13)
    at async Server.requestListener (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/lib/start-server.js:140:13) {
  code: 'P2022',
  clientVersion: '5.22.0',
  meta: { modelName: 'Solution', column: 'solutions.category' }
}
 ○ Compiling /[locale]/settings ...
 ✓ Compiled /[locale]/settings in 644ms (1763 modules)
 ✓ Compiled /[locale]/profile in 133ms (1771 modules)
 ✓ Compiled /api/creators/application/status in 68ms (1009 modules)
[getServerUserFromRequest] 找到认证 cookies: [ 'sb-cardynuoazvaytvinxvm-auth-token' ]
[getServerUserFromRequest] 成功获取用户: 81a361cb-d5a5-440e-8120-4ae4f2e625b4
