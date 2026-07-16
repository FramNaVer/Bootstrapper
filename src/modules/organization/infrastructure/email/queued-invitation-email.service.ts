// QueuedInvitationEmailService — decorator แบบเดียวกับ QueuedEmailService ฝั่ง auth
// เข้าคิวก่อน (ได้ retry จาก BullMQ) → คิวใช้ไม่ได้ค่อยส่ง inline
import { InvitationEmailService } from "../../application/ports/invitation-email.service"
import { enqueueEmail } from "@shared/queue/email.queue"

export class QueuedInvitationEmailService implements InvitationEmailService {
  constructor(private inline: InvitationEmailService) {}

  async sendInvite(to: string, acceptUrl: string): Promise<void> {
    const queued = await enqueueEmail({ kind: "invitation", to, url: acceptUrl })
    if (!queued) await this.inline.sendInvite(to, acceptUrl)
  }
}
