import { describe, it, expect, vi, beforeEach } from "vitest"
import { OutboxProcessor } from "../outbox.processor"
import { OutboxRepository } from "../outbox.repository"
import { UnitOfWork, TransactionContext } from "@shared/database/unit-of-work"

const FAKE_TX: TransactionContext = { tx: "fake" }

const mockOutboxRepo: OutboxRepository = {
    create: vi.fn(),
    claimBatch: vi.fn(),
    markProcessed: vi.fn(),
    markFailed: vi.fn(),
}

const mockUow: UnitOfWork = {
    run: vi.fn(async (fn: (tx: TransactionContext) => Promise<unknown>) =>
        fn(FAKE_TX)
    ) as UnitOfWork["run"],
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe("OutboxProcessor", () => {
    it("dispatches events to the handler and marks processed in the same tx", async () => {
        const handler = vi.fn().mockResolvedValue(undefined)
        vi.mocked(mockOutboxRepo.claimBatch).mockResolvedValue([
            { id: "evt-1", type: "board.card-moved", payload: { cardId: "c1" } },
        ])
        const processor = new OutboxProcessor(mockOutboxRepo, mockUow, {
            "board.card-moved": handler,
        })

        const count = await processor.processBatch()

        expect(count).toBe(1)
        expect(handler).toHaveBeenCalledWith({ cardId: "c1" }, FAKE_TX)
        // markProcessed อยู่ใน transaction เดียวกับ handler (tx token เดียวกัน)
        expect(mockOutboxRepo.markProcessed).toHaveBeenCalledWith("evt-1", FAKE_TX)
        expect(mockOutboxRepo.markFailed).not.toHaveBeenCalled()
    })

    it("marks the event failed (not processed) when the handler throws", async () => {
        vi.mocked(mockOutboxRepo.claimBatch).mockResolvedValue([
            { id: "evt-1", type: "board.card-moved", payload: {} },
        ])
        const processor = new OutboxProcessor(mockOutboxRepo, mockUow, {
            "board.card-moved": vi.fn().mockRejectedValue(new Error("boom")),
        })

        await processor.processBatch()

        expect(mockOutboxRepo.markFailed).toHaveBeenCalledWith("evt-1", "boom")
        expect(mockOutboxRepo.markProcessed).not.toHaveBeenCalled()
    })

    it("marks failed when no handler is registered for the event type", async () => {
        vi.mocked(mockOutboxRepo.claimBatch).mockResolvedValue([
            { id: "evt-2", type: "unknown.type", payload: {} },
        ])
        const processor = new OutboxProcessor(mockOutboxRepo, mockUow, {})

        await processor.processBatch()

        expect(mockOutboxRepo.markFailed).toHaveBeenCalledWith(
            "evt-2",
            expect.stringContaining("unknown.type")
        )
    })

    it("keeps processing remaining events after one fails", async () => {
        const okHandler = vi.fn().mockResolvedValue(undefined)
        vi.mocked(mockOutboxRepo.claimBatch).mockResolvedValue([
            { id: "evt-bad", type: "bad", payload: {} },
            { id: "evt-good", type: "good", payload: {} },
        ])
        const processor = new OutboxProcessor(mockOutboxRepo, mockUow, {
            bad: vi.fn().mockRejectedValue(new Error("boom")),
            good: okHandler,
        })

        const count = await processor.processBatch()

        expect(count).toBe(2)
        expect(okHandler).toHaveBeenCalled()
        expect(mockOutboxRepo.markProcessed).toHaveBeenCalledWith("evt-good", FAKE_TX)
    })
})
