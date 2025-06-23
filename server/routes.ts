
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import cookieParser from "cookie-parser";

export async function registerRoutes(app: Express): Promise<Server> {
  // Add cookie parser middleware
  app.use(cookieParser());

  // Middleware to check authentication
  const requireAuth = async (req: any, res: any, next: any) => {
    const sessionId = req.cookies.sessionId;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const sessionData = await storage.getSession(sessionId);
    if (!sessionData) {
      res.clearCookie('sessionId');
      return res.status(401).json({ error: 'Sessão inválida' });
    }

    req.user = sessionData.user;
    req.session = sessionData.session;
    next();
  };

  // Check authentication status
  app.get('/api/auth/me', async (req, res) => {
    const sessionId = req.cookies.sessionId;
    
    if (!sessionId) {
      return res.json({ user: null, authenticated: false });
    }

    const sessionData = await storage.getSession(sessionId);
    if (!sessionData) {
      res.clearCookie('sessionId');
      return res.json({ user: null, authenticated: false });
    }

    const { password, ...userWithoutPassword } = sessionData.user;
    res.json({ 
      user: userWithoutPassword, 
      authenticated: true 
    });
  });

  // Login route
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
      }

      const user = await storage.validateUser(username, password);
      if (!user) {
        return res.status(401).json({ error: 'Usuário ou senha incorretos' });
      }

      const sessionId = await storage.createSession(user.id);
      
      // Set cookie with session
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      const { password: _, ...userWithoutPassword } = user;
      res.json({ 
        user: userWithoutPassword, 
        success: true 
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Register route
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
      }

      const user = await storage.createUser({ username, password });
      const sessionId = await storage.createSession(user.id);
      
      // Set cookie with session
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      const { password: _, ...userWithoutPassword } = user;
      res.json({ 
        user: userWithoutPassword, 
        success: true 
      });
    } catch (error) {
      console.error('Register error:', error);
      if (error instanceof Error && error.message === 'Usuário já existe') {
        return res.status(409).json({ error: 'Usuário já existe' });
      }
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Logout route
  app.post('/api/auth/logout', async (req, res) => {
    const sessionId = req.cookies.sessionId;
    
    if (sessionId) {
      await storage.deleteSession(sessionId);
    }
    
    res.clearCookie('sessionId');
    res.json({ success: true });
  });

  // Protected routes - all other API routes require authentication
  app.use('/api/protected/*', requireAuth);

  const httpServer = createServer(app);
  return httpServer;
}
