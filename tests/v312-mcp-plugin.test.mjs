import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createVeredictaMcpServer } from '../lib/mcp.js';
import mcpHandler from '../api/mcp.js';
import apiHandler from '../api/index.js';
import { isChatGptCimdClient, validateOAuthClient } from '../lib/oauth.js';

const [clientTransport,serverTransport]=InMemoryTransport.createLinkedPair();
const server=createVeredictaMcpServer();
const client=new Client({name:'veredicta-test',version:'1.0.0'});

await server.connect(serverTransport);
await client.connect(clientTransport);
const listed=await client.listTools();
const names=listed.tools.map(tool=>tool.name).sort();

assert.deepEqual(names,[
  'buscar_analise_veredicta',
  'buscar_caso_veredicta',
  'consultar_fontes_juridicas_veredicta',
  'consultar_status_veredicta',
  'criar_caso_veredicta',
  'enviar_analise_veredicta',
  'importar_casos_sinteticos_veredicta',
  'listar_casos_veredicta',
  'listar_historico_veredicta'
]);

for(const tool of listed.tools){
  assert.equal(tool.annotations?.openWorldHint,false,`${tool.name} deve ser fechado ao domínio Veredicta`);
  assert.deepEqual(tool._meta?.securitySchemes,[{type:'oauth2',scopes:['veredicta']}]);
}

const writeTool=listed.tools.find(tool=>tool.name==='enviar_analise_veredicta');
assert.equal(writeTool.annotations?.readOnlyHint,false);
assert.deepEqual(writeTool.inputSchema.required.sort(),['analyst','audit','case_id','source_contract_sha256'].sort());

const plugin=JSON.parse(fs.readFileSync(new URL('../plugins/veredicta/.codex-plugin/plugin.json',import.meta.url),'utf8'));
const mcp=JSON.parse(fs.readFileSync(new URL('../plugins/veredicta/.mcp.json',import.meta.url),'utf8'));
const vercel=JSON.parse(fs.readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
assert.equal(plugin.name,'veredicta');
assert.equal(plugin.version,'3.14.2');
assert.ok(plugin.skills);
assert.equal(mcp.mcpServers.veredicta.url,'https://validation-six-tawny.vercel.app/mcp');
assert.ok(vercel.rewrites.some(rule=>rule.source==='/mcp'&&rule.destination==='/api/mcp'));
assert.ok(vercel.rewrites.some(rule=>rule.source==='/.well-known/oauth-protected-resource'));
assert.equal(isChatGptCimdClient('https://chatgpt.com/oauth/client.json'),true);
assert.equal(isChatGptCimdClient('https://chatgpt.com/oauth/example_callback/client.json'),true);
assert.equal(isChatGptCimdClient('https://evil.example/oauth/client.json'),false);
assert.equal(validateOAuthClient('https://chatgpt.com/oauth/client.json',''),true);
assert.equal(validateOAuthClient('https://chatgpt.com/oauth/client.json','unexpected-secret'),false);

function mockResponse(){
  return {
    statusCode:200,headers:{},body:'',
    setHeader(name,value){this.headers[String(name).toLowerCase()]=value},
    end(value=''){this.body=String(value)}
  };
}
const protectedRes=mockResponse();
await apiHandler({method:'GET',headers:{host:'veredicta.test','x-forwarded-proto':'https'},query:{action:'oauth-protected-resource'}},protectedRes);
assert.equal(protectedRes.statusCode,200);
assert.equal(JSON.parse(protectedRes.body).resource,'https://veredicta.test/mcp');
const authServer=mockResponse();
await apiHandler({method:'GET',headers:{host:'veredicta.test','x-forwarded-proto':'https'},query:{action:'oauth-authorization-server'}},authServer);
assert.equal(authServer.statusCode,200);
assert.equal(JSON.parse(authServer.body).client_id_metadata_document_supported,true);
assert.doesNotMatch(fs.readFileSync(new URL('../api/index.js',import.meta.url),'utf8'),/legal_source_version:process\.env\.LEGAL_SOURCE_VERSION\|\|null/);
assert.match(fs.readFileSync(new URL('../api/index.js',import.meta.url),'utf8'),/MP-1\.376-2026-sha256-/);
assert.match(fs.readFileSync(new URL('../api/index.js',import.meta.url),'utf8'),/content:mpText/);
assert.match(fs.readFileSync(new URL('../api/index.js',import.meta.url),'utf8'),/content:memoText/);
assert.ok(vercel.rewrites.some(rule=>rule.source==='/api/gpt/legal-sources'&&rule.destination==='/api?action=legal-sources'));

await client.close();
await server.close();

const httpServer=http.createServer(async(req,res)=>{
  const chunks=[];
  for await(const chunk of req)chunks.push(chunk);
  const raw=Buffer.concat(chunks).toString('utf8');
  req.body=raw?JSON.parse(raw):undefined;
  await mcpHandler(req,res);
});
await new Promise(resolve=>httpServer.listen(0,'127.0.0.1',resolve));
const address=httpServer.address();
const httpClient=new Client({name:'veredicta-http-test',version:'1.0.0'});
const httpTransport=new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${address.port}/mcp`));
await httpClient.connect(httpTransport);
const httpTools=await httpClient.listTools();
assert.deepEqual(httpTools.tools.map(tool=>tool.name).sort(),names);
await httpClient.close();
await new Promise(resolve=>httpServer.close(resolve));
console.log('v3.12 MCP/plugin tests passed');
