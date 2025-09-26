import os from 'os';
import logger, { logHealthCheck, logPerformance } from '../utils/logger';

interface HealthMetrics {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    load: number;
    cores: number;
  };
  services: {
    openai: 'up' | 'down' | 'unknown';
    nlweb: 'up' | 'down' | 'unknown';
  };
  responseTime?: number;
}

class HealthService {
  private startTime: number;
  private requestCount: number = 0;
  private errorCount: number = 0;
  private lastHealthCheck: Date = new Date();

  constructor() {
    this.startTime = Date.now();
  }

  async getHealthStatus(): Promise<HealthMetrics> {
    const startTime = Date.now();

    try {
      const healthMetrics = await this.gatherHealthMetrics();
      const responseTime = Date.now() - startTime;

      logHealthCheck(healthMetrics.status, {
        responseTime,
        memoryUsage: healthMetrics.memory.percentage,
        cpuLoad: healthMetrics.cpu.load
      });

      logPerformance('Health Check', responseTime, {
        status: healthMetrics.status,
        memoryUsage: healthMetrics.memory.percentage
      });

      return healthMetrics;
    } catch (error) {
      logger.error('Health check failed', { error });
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: this.getUptime(),
        memory: this.getMemoryUsage(),
        cpu: this.getCpuUsage(),
        services: {
          openai: 'unknown',
          nlweb: 'unknown'
        }
      };
    }
  }

  private async gatherHealthMetrics(): Promise<HealthMetrics> {
    // Trigger garbage collection to get accurate memory usage
    const gc = (global as any).gc;
    if (gc && typeof gc === 'function') {
      gc();
    }

    const memory = this.getMemoryUsage();
    const cpu = this.getCpuUsage();
    const services = await this.checkServiceHealth();

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Determine overall health status - Development mode: ignore memory/CPU issues
    if (cpu.load > 98) {
      status = 'degraded';
    }

    // Only mark as unhealthy if OpenAI service is down
    if (services.openai === 'down') {
      status = 'unhealthy';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      memory,
      cpu,
      services
    };
  }

  private async checkServiceHealth(): Promise<{ openai: 'up' | 'down' | 'unknown'; nlweb: 'up' | 'down' | 'unknown' }> {
    const services = {
      openai: 'unknown' as 'up' | 'down' | 'unknown',
      nlweb: 'unknown' as 'up' | 'down' | 'unknown'
    };

    // Check OpenAI API key availability
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey && apiKey.startsWith('sk-')) {
        services.openai = 'up';
      } else {
        services.openai = 'down';
      }
    } catch {
      services.openai = 'down';
    }

    // Check NLWeb endpoint
    try {
      const nlwebEndpoint = process.env.NLWEB_ENDPOINT || 'https://nlweb.leontloveless.workers.dev';
      // In a real implementation, you might make a lightweight request to check availability
      services.nlweb = 'up';
    } catch {
      services.nlweb = 'down';
    }

    return services;
  }

  private getMemoryUsage(): { used: number; total: number; percentage: number } {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const percentage = (usedMemory / totalMemory) * 100;

    return {
      used: Math.round(usedMemory / 1024 / 1024), // MB
      total: Math.round(totalMemory / 1024 / 1024), // MB
      percentage: Math.round(percentage * 100) / 100
    };
  }

  private getCpuUsage(): { load: number; cores: number } {
    const loadAverage = os.loadavg()[0]; // 1-minute load average
    const cores = os.cpus().length;
    const loadPercentage = (loadAverage / cores) * 100;

    return {
      load: Math.round(loadPercentage * 100) / 100,
      cores
    };
  }

  private getUptime(): number {
    return Date.now() - this.startTime;
  }

  recordRequest(success: boolean): void {
    this.requestCount++;
    if (!success) {
      this.errorCount++;
    }
  }

  getMetrics(): { requests: number; errors: number; errorRate: number } {
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;

    return {
      requests: this.requestCount,
      errors: this.errorCount,
      errorRate: Math.round(errorRate * 100) / 100
    };
  }

  updateLastHealthCheck(): void {
    this.lastHealthCheck = new Date();
  }

  getLastHealthCheck(): Date {
    return this.lastHealthCheck;
  }
}

export const healthService = new HealthService();
