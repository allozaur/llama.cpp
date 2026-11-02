import{p as _,f as w,a3 as r,s,a as T,d as b,e as P}from"./iframe-BxvSZK0j.js";import{c as R,i as A,d as L}from"./create-runtime-stories-DF7OwIoM.js";import{S as V,a as i}from"./StateGalleryItem-BMGszy9q.js";import{F as n}from"./fixtures-OPyN4rPu.js";import{l as e}from"./ProjectIntro-DKI4MEG7.js";import{f as m,g as M}from"./library.constants-v9JM2Zdd.js";import"./preload-helper-PPVm8Dsz.js";import"./index.svelte-BBrD1Za8.js";import"./clone-D1y8Q09X.js";import"./ui.enums-DjR_vYxk.js";import"./index.svelte-B6jPthz0.js";import"./audio-format-YL0iSAfS.js";import"./pwa.constants-BmTqcZii.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./info-Cb5cGIZT.js";import"./Icon-CSRBsjq8.js";import"./each-DMxlN0HO.js";import"./svelte-element-BAftWIbD.js";import"./chat-tabs.constants-BXUE-QDX.js";import"./ActionIcon-CLpfwUjP.js";import"./button-xywSqPau.js";import"./this-PF-vsikk.js";import"./ChatFormCurrentWorkingDirectory-828uF3xY.js";import"./css-classes.constants-B-GZedvn.js";import"./check-DMUsyudZ.js";import"./copy-DUPeaLcG.js";import"./GlassKey-DQnWqGBZ.js";import"./x-DXCCWZ3I.js";import"./input-CLr4-AYd.js";import"./input-BVFa53i-.js";import"./drawer-trigger-DQGelv4k.js";import"./dialog-content-Bi_qY7pE.js";import"./dialog-description-D6Mb1Tvy.js";import"./popover-trigger-DEKMn7ku.js";import"./floating-layer-anchor-DpndBh7P.js";import"./chevron-right-DSI_V293.js";import"./ChatFormContextGauge-CeE9WGbf.js";import"./plus-Bas3mM1L.js";import"./ChatFormActionRecord-JuX5z5iA.js";import"./square-BwMbYbuj.js";import"./ChatFormActionSubmit-JvGaFQpW.js";import"./ChatFormActionReasoning-B03i8g7l.js";import"./index-XKzLgq2d.js";import"./minus-BiJPcaSd.js";import"./circle-DEMsv9Zq.js";import"./checkbox-C17vn_rH.js";import"./hidden-input-01vZpQIL.js";import"./collapsible-trigger-DIE3Fs9m.js";import"./chevron-down-D7MPUDbV.js";import"./label-2OikHIdw.js";import"./scroll-area-CP3kH8ff.js";import"./logo-CTAdF4cr.js";import"./index-CDO0wwOG.js";import"./mounted-DosV_eyV.js";import"./separator-DEWw0QPu.js";import"./card-title-Bik3b823.js";import"./ChatScreenActionScrollDown-BfQw16Ii.js";import"./ChatTabsItem-BWqVFd0V.js";import"./ChatScreenDragOverlay-oERtBrSH.js";import"./ChatScreenServerError-kyJSbEPe.js";import"./alert-title-DFRtSKPR.js";import"./ChatScreenStreamResumeStatus-CuLfTRBT.js";import"./SyntaxHighlightedCode-D8sYXQdv.js";import"./CollapsibleTerminalBlock-DKIuhqts.js";import"./download-iVMq-bXa.js";import"./index-C9PbKOs8.js";import"./pencil-9rXUpy81.js";import"./index-DwS4Awyr.js";import"./textarea-q08Yt5sv.js";import"./trash-BrTaTTho.js";import"./empty-title-7hSBoaDA.js";import"./skeleton-Bcv1uFKK.js";import"./toggle-group-item-BeZEKUxW.js";import"./toggle-BbwUMDz5.js";import"./McpCapabilitiesBadges-mSrUEJ8e.js";import"./badge-Cdt4ydpE.js";import"./wrench-C98Yxdx8.js";import"./message-square-BRQcxciD.js";import"./McpConnectionLogs-CaNlXDPy.js";import"./radio-group-item-BtppKCUx.js";import"./switch-D5IRHhP0.js";import"./settings-vDMD8fT9.js";import"./ChatScreenGreeting-DUs05vEq.js";import"./button-group-separator-BccWv2la.js";import"./hover-card-trigger-46ZsC1b5.js";const E={component:e,parameters:{layout:"centered"},title:"Chat/ChatScreen/ChatMessages/ChatMessageStatistics"},{Story:k}=L(),o={predictedMs:3120,predictedTokens:164,promptMs:412,promptTokens:1830};var N=P("<!> <!> <!> <!> <!> <!> <!> <!> <!>",1);function f(y,v){_(v,!1),A(),k(y,{asChild:!0,name:"States",children:(G,D)=>{V(G,{columns:1,children:(C,x)=>{var l=N(),p=w(l);i(p,{label:"Default",note:"generation view",children:(t,a)=>{e(t,r(()=>o))},$$slots:{default:!0}});var d=s(p,2);i(d,{label:"Reading view",children:(t,a)=>{e(t,r(()=>o,{get initialView(){return m.READING}}))},$$slots:{default:!0}});var c=s(d,2);i(c,{label:"Tools view",note:"agentic",children:(t,a)=>{e(t,r(()=>o,{get agenticTimings(){return n},get initialView(){return m.TOOLS}}))},$$slots:{default:!0}});var g=s(c,2);i(g,{label:"Summary view",note:"agentic",children:(t,a)=>{e(t,r(()=>o,{get agenticTimings(){return n},get initialView(){return m.SUMMARY}}))},$$slots:{default:!0}});var S=s(g,2);i(S,{label:"Agentic without summary",children:(t,a)=>{e(t,r(()=>o,{get agenticTimings(){return n},hideSummary:!0}))},$$slots:{default:!0}});var u=s(S,2);i(u,{label:"Generation only",children:(t,a)=>{e(t,r(()=>o,{get mode(){return M.GENERATION}}))},$$slots:{default:!0}});var $=s(u,2);i($,{label:"Reading only",children:(t,a)=>{e(t,r(()=>o,{get mode(){return M.READING}}))},$$slots:{default:!0}});var h=s($,2);i(h,{label:"Live, processing prompt",children:(t,a)=>{e(t,{isLive:!0,isProcessingPrompt:!0,predictedMs:void 0,predictedTokens:void 0,promptMs:6e3,promptTokens:4200})},$$slots:{default:!0}});var I=s(h,2);i(I,{label:"Live, generating",children:(t,a)=>{e(t,r(()=>o,{isLive:!0,predictedMs:5120,predictedTokens:128}))},$$slots:{default:!0}}),T(C,l)},$$slots:{default:!0}})},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<StateGallery columns={1}>
	<StateGalleryItem label="Default" note="generation view">
		<ChatMessageStatistics {...stats} />
	</StateGalleryItem>

	<StateGalleryItem label="Reading view">
		<ChatMessageStatistics {...stats} initialView={ChatMessageStatsView.READING} />
	</StateGalleryItem>

	<StateGalleryItem label="Tools view" note="agentic">
		<ChatMessageStatistics {...stats} {agenticTimings} initialView={ChatMessageStatsView.TOOLS} />
	</StateGalleryItem>

	<StateGalleryItem label="Summary view" note="agentic">
		<ChatMessageStatistics
			{...stats}
			{agenticTimings}
			initialView={ChatMessageStatsView.SUMMARY}
		/>
	</StateGalleryItem>

	<StateGalleryItem label="Agentic without summary">
		<ChatMessageStatistics {...stats} {agenticTimings} hideSummary />
	</StateGalleryItem>

	<StateGalleryItem label="Generation only">
		<ChatMessageStatistics {...stats} mode={ChatMessageStatisticsMode.GENERATION} />
	</StateGalleryItem>

	<StateGalleryItem label="Reading only">
		<ChatMessageStatistics {...stats} mode={ChatMessageStatisticsMode.READING} />
	</StateGalleryItem>

	<StateGalleryItem label="Live, processing prompt">
		<ChatMessageStatistics
			isLive
			isProcessingPrompt
			predictedMs={undefined}
			predictedTokens={undefined}
			promptMs={6000}
			promptTokens={4200}
		/>
	</StateGalleryItem>

	<StateGalleryItem label="Live, generating">
		<ChatMessageStatistics {...stats} isLive predictedMs={5120} predictedTokens={128} />
	</StateGalleryItem>
</StateGallery>`}}}),b()}f.__docgen={data:[],name:"ChatMessageStatistics.stories.svelte"};const O=R(f,E),he=["States"],Me={...O.States,tags:["svelte-csf-v5"]};export{Me as States,he as __namedExportsOrder,E as default};
