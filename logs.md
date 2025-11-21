[Log] [ProtectedRoute] 状态检查: – {loading: false, isAuthenticated: true, requireAuth: true, …}
{loading: false, isAuthenticated: true, requireAuth: true, requiredRoles: [], hasRequiredRole: true, …}Object
[Log] [ProtectedRoute] 权限验证通过，允许访问
[Error] Failed to load resource: the server responded with a status of 400 (Bad Request) (bom, line 0)
[Warning] 更新 BOM 失败: – {success: false, error: "验证失败", details: Object}
{success: false, error: "验证失败", details: Object}Object
[Log] [ProtectedRoute] 状态检查: – {loading: false, isAuthenticated: true, requireAuth: true, …}
{loading: false, isAuthenticated: true, requireAuth: true, requiredRoles: [], hasRequiredRole: true, …}Object
[Log] [ProtectedRoute] 权限验证通过，允许访问
[Error] Failed to load resource: the server responded with a status of 500 (Internal Server Error) (assets, line 0)
[Warning] 添加资产失败: – {success: false, error: {name: "PrismaClientValidationError", clientVersion: "5.22.0"}}
[Error] Failed to load resource: the server responded with a status of 400 (Bad Request) (bom, line 0)
[Warning] 更新 BOM 失败: – {success: false, error: "验证失败", details: Object}
{success: false, error: "验证失败", details: Object}Object
[Error] Failed to load resource: the server responded with a status of 500 (Internal Server Error) (assets, line 0)
[Warning] 添加资产失败: – {success: false, error: {name: "PrismaClientValidationError", clientVersion: "5.22.0"}}
[Error] Failed to load resource: the server responded with a status of 400 (Bad Request) (submit, line 0)

server logs：

    uploaded_by: "ba622705-e59b-42d8-b9cb-a23d1e9de6fb",
+   checksum: String
  }
}

Argument `checksum` is missing.
    at wn (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/@prisma/client/runtime/library.js:29:1363)
    at $n.handleRequestError (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/@prisma/client/runtime/library.js:121:6958)
    at $n.handleAndLogRequestError (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/@prisma/client/runtime/library.js:121:6623)
    at $n.request (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/@prisma/client/runtime/library.js:121:6307)
    at async l (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/@prisma/client/runtime/library.js:130:9633)
    at async Promise.all (index 1)
    at async POST (webpack-internal:///(rsc)/./src/app/api/solutions/[id]/assets/route.ts:76:24)
    at async /Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/compiled/next-server/app-route.runtime.dev.js:6:63809
    at async eU.execute (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/compiled/next-server/app-route.runtime.dev.js:6:53964)
    at async eU.handle (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/compiled/next-server/app-route.runtime.dev.js:6:65062)
    at async doRender (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1333:42)
    at async cacheEntry.responseCache.get.routeKind (/Users/yangyang/Documents/YYCode/OpenAero/openaero.web/node_modules/next/dist/server/base-server.js:1543:40)
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
  clientVersion: '5.22.0'
}
 ✓ Compiled /api/solutions/[id]/submit in 88ms (1105 modules)
[createSupabaseServerFromRequest] 请求中的所有 cookies: [
  {
    name: 'sb-cardynuoazvaytvinxvm-auth-token',
    hasValue: true,
    valueLength: 3130
  }
]
[createSupabaseServerFromRequest] 读取 cookie: sb-cardynuoazvaytvinxvm-auth-token, 长度: 3130
[getServerUserFromRequest] 所有 cookies: [ { name: 'sb-cardynuoazvaytvinxvm-auth-token', hasValue: true } ]
[createSupabaseServerFromRequest] 读取 cookie: sb-cardynuoazvaytvinxvm-auth-token, 长度: 3130
[createSupabaseServerFromRequest] 读取 cookie: sb-cardynuoazvaytvinxvm-auth-token, 长度: 3130
[createSupabaseServerFromRequest] 读取 cookie: sb-cardynuoazvaytvinxvm-auth-token, 长度: 3130
Using the user object as returned from supabase.auth.getSession() or from some supabase.auth.onAuthStateChange() events could be insecure! This value comes directly from the storage medium (usually cookies on the server) and may not be authentic. Use supabase.auth.getUser() instead which authenticates the data by contacting the Supabase Auth server.
[getServerUserFromRequest] 通过 session 成功获取用户: ba622705-e59b-42d8-b9cb-a23d1e9de6fb
[getExtendedUser] 开始获取用户信息: ba622705-e59b-42d8-b9cb-a23d1e9de6fb
prisma:error 
Invalid `prisma.solutionFile.create()` invocation:

{
  data: {
    solution_id: "cmi7gq23a0005l0yxdol1o3ki",
    file_type: "IMAGE",
    url: "http://localhost:3000/uploads/temp/1763647687737-50da60592c421b89fdffa81688550670.jpg",
    original_name: "1763647687737-50da60592c421b89fdffa81688550670.jpg",
    filename: "1763647687737-50da60592c421b89fdffa81688550670.jpg",
    mime_type: "application/octet-stream",
    size: 0,
    path: "http://localhost:3000/uploads/temp/1763647687737-50da60592c421b89fdffa81688550670.jpg",
    description: undefined,
    uploaded_by: "ba622705-e59b-42d8-b9cb-a23d1e9de6fb",
+   checksum: String
  }
}

Argument `checksum` is missing.
prisma:error 
Invalid `prisma.solutionFile.create()` invocation:

{
  data: {
    solution_id: "cmi7gq23a0005l0yxdol1o3ki",
    file_type: "IMAGE",
    url: "http://localhost:3000/uploads/temp/1763647693486-f9a2fa25aba89d66c537b356cc635f90.jpg",
    original_name: "1763647693486-f9a2fa25aba89d66c537b356cc635f90.jpg",
    filename: "1763647693486-f9a2fa25aba89d66c537b356cc635f90.jpg",
    mime_type: "application/octet-stream",
    size: 0,
    path: "http://localhost:3000/uploads/temp/1763647693486-f9a2fa25aba89d66c537b356cc635f90.jpg",
    description: undefined,
    uploaded_by: "ba622705-e59b-42d8-b9cb-a23d1e9de6fb",
+   checksum: String
  }
}

Argument `checksum` is missing.
[getExtendedUser] 成功获取 auth.users
[getExtendedUser] 成功获取 user_profiles: exists
[authenticateRequest] 认证成功: {
  userId: 'ba622705-e59b-42d8-b9cb-a23d1e9de6fb',
  email: 'tigeryangy@gmail.com',
  roles: [ 'USER', 'CREATOR' ],
  primaryRole: 'CREATOR'
}
prisma:error Error in PostgreSQL connection: Error { kind: Closed, cause: None }