import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createVeredictaMcpServer } from '../lib/mcp.js';

function methodNotAllowed(res){
  res.statusCode=405;
  res.setHeader('content-type','application/json');
  res.end(JSON.stringify({jsonrpc:'2.0',error:{code:-32000,message:'Method not allowed.'},id:null}));
}

export default async function handler(req,res){
  if(req.method!=='POST')return methodNotAllowed(res);
  const server=createVeredictaMcpServer();
  const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined});
  try{
    await server.connect(transport);
    await transport.handleRequest(req,res,req.body);
  }catch(error){
    console.error(JSON.stringify({scope:'mcp',error:error?.message||String(error)}));
    if(!res.headersSent){
      res.statusCode=500;
      res.setHeader('content-type','application/json');
      res.end(JSON.stringify({jsonrpc:'2.0',error:{code:-32603,message:'Internal server error'},id:null}));
    }
  }finally{
    await transport.close().catch(()=>{});
    await server.close().catch(()=>{});
  }
}
