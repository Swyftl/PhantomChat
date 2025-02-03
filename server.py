import asyncio
from websockets.asyncio.server import serve
from websockets.exceptions import ConnectionClosedOK

async def handler(websocket):
    while True:
        try:
            message = await websocket.recv()
        except ConnectionClosedOK:
            break
        async for message in message:
            print(message)
async def main():
    async with serve(handler, "", 8080):
        await asyncio.get_running_loop().create_future()

if __name__ == "__main__":
    asyncio.run(main())
