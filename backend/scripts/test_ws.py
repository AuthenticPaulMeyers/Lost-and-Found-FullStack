import asyncio, json
import websockets #type: ignore

async def test():
    uri = 'ws://127.0.0.1:8000/ws/chat/cee9fbea-bde4-48f6-a246-ff4cd5d05cf6/'
    try:
        async with websockets.connect(uri) as ws:
            print('connected')
            await ws.send(json.dumps({'action':'presence','userId':'test-user'}))
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=2)
                print('recv:', msg)
            except asyncio.TimeoutError:
                print('no immediate response')
    except Exception as e:
        print('connect error', e)

if __name__ == '__main__':
    asyncio.run(test())
