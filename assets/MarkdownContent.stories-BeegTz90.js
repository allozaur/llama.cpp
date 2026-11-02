import{p as i,g as s,d as p,x as n}from"./iframe-BxvSZK0j.js";import{c as a,i as m,d as c}from"./create-runtime-stories-DF7OwIoM.js";import"./ActionIcon-CLpfwUjP.js";import"./ChatFormCurrentWorkingDirectory-828uF3xY.js";import"./GlassKey-DQnWqGBZ.js";import{O as l}from"./ProjectIntro-DKI4MEG7.js";import"./ChatFormActionRecord-JuX5z5iA.js";import"./ChatFormActionSubmit-JvGaFQpW.js";import"./ChatFormActionReasoning-B03i8g7l.js";import"./ChatFormContextGauge-CeE9WGbf.js";import"./ChatScreenDragOverlay-oERtBrSH.js";import"./ChatScreenServerError-kyJSbEPe.js";import"./ChatScreenStreamResumeStatus-CuLfTRBT.js";import"./SyntaxHighlightedCode-D8sYXQdv.js";import"./CollapsibleTerminalBlock-DKIuhqts.js";import"./library.constants-v9JM2Zdd.js";import"./audio-format-YL0iSAfS.js";import"./button-xywSqPau.js";import"./empty-title-7hSBoaDA.js";import"./skeleton-Bcv1uFKK.js";import"./index.svelte-B6jPthz0.js";import"./toggle-group-item-BeZEKUxW.js";import"./McpCapabilitiesBadges-mSrUEJ8e.js";import"./McpConnectionLogs-CaNlXDPy.js";import"./card-title-Bik3b823.js";import"./textarea-q08Yt5sv.js";import"./preload-helper-PPVm8Dsz.js";import"./ui.enums-DjR_vYxk.js";import"./css-classes.constants-B-GZedvn.js";import"./check-DMUsyudZ.js";import"./Icon-CSRBsjq8.js";import"./each-DMxlN0HO.js";import"./svelte-element-BAftWIbD.js";import"./copy-DUPeaLcG.js";import"./x-DXCCWZ3I.js";import"./this-PF-vsikk.js";import"./input-CLr4-AYd.js";import"./input-BVFa53i-.js";import"./drawer-trigger-DQGelv4k.js";import"./clone-D1y8Q09X.js";import"./dialog-content-Bi_qY7pE.js";import"./dialog-description-D6Mb1Tvy.js";import"./popover-trigger-DEKMn7ku.js";import"./floating-layer-anchor-DpndBh7P.js";import"./chevron-right-DSI_V293.js";import"./plus-Bas3mM1L.js";import"./checkbox-C17vn_rH.js";import"./hidden-input-01vZpQIL.js";import"./minus-BiJPcaSd.js";import"./collapsible-trigger-DIE3Fs9m.js";import"./index-XKzLgq2d.js";import"./circle-DEMsv9Zq.js";import"./info-Cb5cGIZT.js";import"./chevron-down-D7MPUDbV.js";import"./label-2OikHIdw.js";import"./scroll-area-CP3kH8ff.js";import"./logo-CTAdF4cr.js";import"./index-CDO0wwOG.js";import"./mounted-DosV_eyV.js";import"./separator-DEWw0QPu.js";import"./index.svelte-BBrD1Za8.js";import"./ChatScreenActionScrollDown-BfQw16Ii.js";import"./ChatTabsItem-BWqVFd0V.js";import"./square-BwMbYbuj.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./download-iVMq-bXa.js";import"./index-C9PbKOs8.js";import"./pencil-9rXUpy81.js";import"./index-DwS4Awyr.js";import"./trash-BrTaTTho.js";import"./badge-Cdt4ydpE.js";import"./wrench-C98Yxdx8.js";import"./message-square-BRQcxciD.js";import"./chat-tabs.constants-BXUE-QDX.js";import"./radio-group-item-BtppKCUx.js";import"./switch-D5IRHhP0.js";import"./settings-vDMD8fT9.js";import"./ChatScreenGreeting-DUs05vEq.js";import"./button-group-separator-BccWv2la.js";import"./hover-card-trigger-46ZsC1b5.js";import"./alert-title-DFRtSKPR.js";import"./pwa.constants-BmTqcZii.js";import"./toggle-BbwUMDz5.js";const d=String.raw`
# Building a Modern Chat Application with SvelteKit

I'll help you create a **production-ready chat application** using SvelteKit, TypeScript, and WebSockets. This implementation includes real-time messaging, user authentication, and message persistence.

## 🚀 Quick Start

First, let's set up the project:

${"```"}bash
npm create svelte@latest chat-app
cd chat-app
npm install
npm install socket.io socket.io-client
npm install @prisma/client prisma
npm run dev
${"```"}

## 📁 Project Structure

${"```"}
chat-app/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte
│   │   ├── +page.svelte
│   │   └── api/
│   │       └── socket/+server.ts
│   ├── lib/
│   │   ├── components/
│   │   │   ├── ChatMessage.svelte
│   │   │   └── ChatInput.svelte
│   │   └── stores/
│   │       └── chat.ts
│   └── app.html
├── prisma/
│   └── schema.prisma
└── package.json
${"```"}

## 💻 Implementation

### WebSocket Server

${"```"}typescript
// src/lib/server/socket.ts
import { Server } from 'socket.io';
import type { ViteDevServer } from 'vite';

export function initializeSocketIO(server: ViteDevServer) {
    const io = new Server(server.httpServer || server, {
        cors: {
            origin: process.env.ORIGIN || 'http://localhost:5173',
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);
        
        socket.on('message', async (data) => {
            // Broadcast to all clients
            io.emit('new-message', {
                id: crypto.randomUUID(),
                userId: socket.id,
                content: data.content,
                timestamp: new Date().toISOString()
            });
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });

    return io;
}
${"```"}

### Client Store

${"```"}typescript
// src/lib/stores/chat.ts
import { writable } from 'svelte/store';
import io from 'socket.io-client';

export interface Message {
    id: string;
    userId: string;
    content: string;
    timestamp: string;
}

function createChatStore() {
    const { subscribe, update } = writable<Message[]>([]);
    let socket: ReturnType<typeof io>;
    
    return {
        subscribe,
        connect: () => {
            socket = io('http://localhost:5173');
            
            socket.on('new-message', (message: Message) => {
                update(messages => [...messages, message]);
            });
        },
        sendMessage: (content: string) => {
            if (socket && content.trim()) {
                socket.emit('message', { content });
            }
        }
    };
}

export const chatStore = createChatStore();
${"```"}

## 🎯 Key Features

✅ **Real-time messaging** with WebSockets  
✅ **Message persistence** using Prisma + PostgreSQL  
✅ **Type-safe** with TypeScript  
✅ **Responsive UI** for all devices  
✅ **Auto-reconnection** on connection loss  

## 📊 Performance Metrics

| Metric | Value |
|--------|-------|
| **Message Latency** | < 50ms |
| **Concurrent Users** | 10,000+ |
| **Messages/Second** | 5,000+ |
| **Uptime** | 99.9% |

## 🔧 Configuration

### Environment Variables

${"```"}env
DATABASE_URL="postgresql://user:password@localhost:5432/chat"
JWT_SECRET="your-secret-key"
REDIS_URL="redis://localhost:6379"
${"```"}

## 🚢 Deployment

Deploy to production using Docker:

${"```"}dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "build"]
${"```"}

---

*Need help? Check the [documentation](https://kit.svelte.dev) or [open an issue](https://github.com/sveltejs/kit/issues)*
`,u={component:l,parameters:{layout:"centered"},title:"Content/MarkdownContent"},{Story:g}=c();function t(e,o){i(o,!1),m();{let r=n(()=>({class:"max-w-[56rem] w-[calc(100vw-2rem)]",content:d}));g(e,{get args(){return s(r)},name:"Default",parameters:{__svelteCsf:{rawCode:"<MarkdownContent {...args} />"}}})}p()}t.__docgen={data:[],name:"MarkdownContent.stories.svelte"};const h=a(t,u),qt=["Default"],Qt={...h.Default,tags:["svelte-csf-v5"]};export{Qt as Default,qt as __namedExportsOrder,u as default};
