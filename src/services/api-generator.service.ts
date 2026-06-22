import { Knex } from 'knex';

// Express types (optional dependency)
interface Request {
  params: Record<string, string>;
  query: Record<string, any>;
  body: any;
}

interface Response {
  status(code: number): Response;
  json(data: any): void;
}

interface NextFunction {
  (): void;
}

export interface ApiGeneratorOptions {
  prefix?: string;
  enableAuth?: boolean;
  enableValidation?: boolean;
  enablePagination?: boolean;
  maxLimit?: number;
}

export interface EndpointConfig {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  handler: string;
  description?: string;
  middleware?: string[];
}

export interface ApiRoutes {
  province: EndpointConfig[];
  regency: EndpointConfig[];
  district: EndpointConfig[];
  village: EndpointConfig[];
}

export class ApiGeneratorService {
  private db: Knex;
  private options: ApiGeneratorOptions;

  constructor(db?: Knex, options: ApiGeneratorOptions = {}) {
    this.db = db || require('../core/database').getDb();
    this.options = {
      prefix: '/api/v1',
      enableAuth: false,
      enableValidation: true,
      enablePagination: true,
      maxLimit: 100,
      ...options
    };
  }

  generateRoutes(): ApiRoutes {
    const prefix = this.options.prefix;

    return {
      province: this.generateCrudRoutes(`${prefix}/provinces`, 'province'),
      regency: this.generateCrudRoutes(`${prefix}/regencies`, 'regency'),
      district: this.generateCrudRoutes(`${prefix}/districts`, 'district'),
      village: this.generateCrudRoutes(`${prefix}/villages`, 'village')
    };
  }

  private generateCrudRoutes(basePath: string, level: string): EndpointConfig[] {
    return [
      {
        path: basePath,
        method: 'GET',
        handler: `list${this.toPascalCase(level)}`,
        description: `List all ${level}s with pagination and filtering`
      },
      {
        path: `${basePath}/:code`,
        method: 'GET',
        handler: `get${this.toPascalCase(level)}`,
        description: `Get ${level} by code`
      },
      {
        path: basePath,
        method: 'POST',
        handler: `create${this.toPascalCase(level)}`,
        description: `Create new ${level}`
      },
      {
        path: `${basePath}/:code`,
        method: 'PUT',
        handler: `update${this.toPascalCase(level)}`,
        description: `Update ${level} by code`
      },
      {
        path: `${basePath}/:code`,
        method: 'DELETE',
        handler: `delete${this.toPascalCase(level)}`,
        description: `Delete ${level} by code`
      }
    ];
  }

  generateExpressRouter(): string {
    const routes = this.generateRoutes();

    let code = `// Auto-generated Express Router for Indonesia Wilayah API\n`;
    code += `// Generated at: ${new Date().toISOString()}\n\n`;
    code += `import { Router, Request, Response } from 'express';\n`;
    code += `import { getDb } from '@cazh/indonesia-wilayah';\n\n`;

    code += `export function createWilayahRouter(options: { db?: any } = {}): Router {\n`;
    code += `  const router = Router();\n`;
    code += `  const db = options.db || getDb();\n\n`;

    // Province routes
    code += `  // Province Routes\n`;
    code += `  router.get('${this.options.prefix}/provinces', async (req: Request, res: Response) => {\n`;
    code += `    try {\n`;
    code += `      const { search, limit = 20, offset = 0 } = req.query;\n`;
    code += `      let query = db('provinces').where('is_active', true);\n`;
    code += `      if (search) query = query.where('name', 'like', \`%\${search}%\`);\n`;
    code += `      const data = await query.orderBy('code').limit(Number(limit)).offset(Number(offset));\n`;
    code += `      res.json({ success: true, data });\n`;
    code += `    } catch (error: any) {\n`;
    code += `      res.status(500).json({ success: false, error: error.message });\n`;
    code += `    }\n`;
    code += `  });\n\n`;

    code += `  router.get('${this.options.prefix}/provinces/:code', async (req: Request, res: Response) => {\n`;
    code += `    try {\n`;
    code += `      const data = await db('provinces').where('code', req.params.code).first();\n`;
    code += `      if (!data) return res.status(404).json({ success: false, error: 'Not found' });\n`;
    code += `      res.json({ success: true, data });\n`;
    code += `    } catch (error: any) {\n`;
    code += `      res.status(500).json({ success: false, error: error.message });\n`;
    code += `    }\n`;
    code += `  });\n\n`;

    // Similar for regency, district, village...
    // (abbreviated for brevity)

    code += `  return router;\n`;
    code += `}\n`;

    return code;
  }

  generateOpenApiSpec(): any {
    const prefix = this.options.prefix;

    return {
      openapi: '3.0.0',
      info: {
        title: 'Indonesia Wilayah API',
        version: '1.0.0',
        description: 'API for Indonesian administrative regions'
      },
      servers: [
        { url: prefix }
      ],
      paths: {
        '/provinces': {
          get: {
            summary: 'List provinces',
            parameters: [
              { name: 'search', in: 'query', schema: { type: 'string' } },
              { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
              { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } }
            ],
            responses: {
              '200': {
                description: 'List of provinces',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Province' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '/provinces/{code}': {
          get: {
            summary: 'Get province by code',
            parameters: [
              { name: 'code', in: 'path', required: true, schema: { type: 'string' } }
            ],
            responses: {
              '200': {
                description: 'Province data',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Province' }
                  }
                }
              }
            }
          }
        }
      },
      components: {
        schemas: {
          Province: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              name: { type: 'string' },
              is_active: { type: 'boolean' }
            }
          }
        }
      }
    };
  }

  private toPascalCase(str: string): string {
    return str
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }
}
