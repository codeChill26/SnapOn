import { ReportRepository } from '../repositories/report.repository';
import { ReportStatus } from '@prisma/client';
import { NotFoundError } from '../lib/errors';

export class ReportService {
  private reportRepository = new ReportRepository();

  async getReports(params: {
    page: number;
    limit: number;
    status?: ReportStatus;
  }) {
    return this.reportRepository.findMany(params);
  }

  async getReportById(id: string) {
    const report = await this.reportRepository.findById(id);
    if (!report) {
      throw new NotFoundError('Report not found');
    }
    return report;
  }

  async updateReportStatus(id: string, status: ReportStatus) {
    const report = await this.reportRepository.findById(id);
    if (!report) {
      throw new NotFoundError('Report not found');
    }
    return this.reportRepository.updateStatus(id, status);
  }
}
