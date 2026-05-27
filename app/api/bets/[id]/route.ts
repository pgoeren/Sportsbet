import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const bet = await prisma.bet.update({
      where: { id },
      data: {
        status: body.status,
        settledAt: body.status !== "pending" ? new Date() : undefined,
      },
    })
    return NextResponse.json({ bet })
  } catch {
    return NextResponse.json({ error: "Failed to update bet" }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.bet.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete bet" }, { status: 500 })
  }
}
