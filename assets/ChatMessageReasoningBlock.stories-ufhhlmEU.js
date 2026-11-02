import{p as G,f,s as r,a as S,g as I,d as M,e as _,x as P}from"./iframe-BxvSZK0j.js";import{c as R,i as B,d as T}from"./create-runtime-stories-DF7OwIoM.js";import{S as w,a as o}from"./StateGalleryItem-BMGszy9q.js";import{B as s,D as A,E as u,s as $}from"./fixtures-OPyN4rPu.js";import{k as t}from"./ProjectIntro-DKI4MEG7.js";import"./preload-helper-PPVm8Dsz.js";import"./library.constants-v9JM2Zdd.js";import"./info-Cb5cGIZT.js";import"./Icon-CSRBsjq8.js";import"./each-DMxlN0HO.js";import"./svelte-element-BAftWIbD.js";import"./ui.enums-DjR_vYxk.js";import"./settings-vDMD8fT9.js";import"./wrench-C98Yxdx8.js";import"./index.svelte-BBrD1Za8.js";import"./clone-D1y8Q09X.js";import"./index.svelte-B6jPthz0.js";import"./audio-format-YL0iSAfS.js";import"./pwa.constants-BmTqcZii.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./chat-tabs.constants-BXUE-QDX.js";import"./ActionIcon-CLpfwUjP.js";import"./button-xywSqPau.js";import"./this-PF-vsikk.js";import"./ChatFormCurrentWorkingDirectory-828uF3xY.js";import"./css-classes.constants-B-GZedvn.js";import"./check-DMUsyudZ.js";import"./copy-DUPeaLcG.js";import"./GlassKey-DQnWqGBZ.js";import"./x-DXCCWZ3I.js";import"./input-CLr4-AYd.js";import"./input-BVFa53i-.js";import"./drawer-trigger-DQGelv4k.js";import"./dialog-content-Bi_qY7pE.js";import"./dialog-description-D6Mb1Tvy.js";import"./popover-trigger-DEKMn7ku.js";import"./floating-layer-anchor-DpndBh7P.js";import"./chevron-right-DSI_V293.js";import"./ChatFormContextGauge-CeE9WGbf.js";import"./plus-Bas3mM1L.js";import"./ChatFormActionRecord-JuX5z5iA.js";import"./square-BwMbYbuj.js";import"./ChatFormActionSubmit-JvGaFQpW.js";import"./ChatFormActionReasoning-B03i8g7l.js";import"./index-XKzLgq2d.js";import"./minus-BiJPcaSd.js";import"./circle-DEMsv9Zq.js";import"./checkbox-C17vn_rH.js";import"./hidden-input-01vZpQIL.js";import"./collapsible-trigger-DIE3Fs9m.js";import"./chevron-down-D7MPUDbV.js";import"./label-2OikHIdw.js";import"./scroll-area-CP3kH8ff.js";import"./logo-CTAdF4cr.js";import"./index-CDO0wwOG.js";import"./mounted-DosV_eyV.js";import"./separator-DEWw0QPu.js";import"./card-title-Bik3b823.js";import"./ChatScreenActionScrollDown-BfQw16Ii.js";import"./ChatTabsItem-BWqVFd0V.js";import"./ChatScreenDragOverlay-oERtBrSH.js";import"./ChatScreenServerError-kyJSbEPe.js";import"./alert-title-DFRtSKPR.js";import"./ChatScreenStreamResumeStatus-CuLfTRBT.js";import"./SyntaxHighlightedCode-D8sYXQdv.js";import"./CollapsibleTerminalBlock-DKIuhqts.js";import"./download-iVMq-bXa.js";import"./index-C9PbKOs8.js";import"./pencil-9rXUpy81.js";import"./index-DwS4Awyr.js";import"./textarea-q08Yt5sv.js";import"./trash-BrTaTTho.js";import"./empty-title-7hSBoaDA.js";import"./skeleton-Bcv1uFKK.js";import"./toggle-group-item-BeZEKUxW.js";import"./toggle-BbwUMDz5.js";import"./McpCapabilitiesBadges-mSrUEJ8e.js";import"./badge-Cdt4ydpE.js";import"./message-square-BRQcxciD.js";import"./McpConnectionLogs-CaNlXDPy.js";import"./radio-group-item-BtppKCUx.js";import"./switch-D5IRHhP0.js";import"./ChatScreenGreeting-DUs05vEq.js";import"./button-group-separator-BccWv2la.js";import"./hover-card-trigger-46ZsC1b5.js";const q={component:t,parameters:{layout:"padded"},title:"Chat/ChatScreen/ChatMessages/ChatMessageReasoningBlock"},{Story:h}=T();var D=_("<!> <!> <!> <!> <!>",1),O=_("<!> <!>",1);function C(y,k){G(k,!1),B();var i=O(),l=f(i);h(l,{asChild:!0,beforeEach:()=>$(),name:"States",children:(n,j)=>{w(n,{columns:1,children:(E,z)=>{var m=D(),p=f(m);o(p,{label:"Collapsed",children:(e,a)=>{t(e,{isStreaming:!1,open:!1,get section(){return s}})},$$slots:{default:!0}});var d=r(p,2);o(d,{label:"Expanded",note:"markdown",children:(e,a)=>{t(e,{isStreaming:!1,open:!0,get section(){return s}})},$$slots:{default:!0}});var g=r(d,2);o(g,{label:"Streaming",children:(e,a)=>{t(e,{isStreaming:!0,open:!0,get section(){return A}})},$$slots:{default:!0}});var c=r(g,2);o(c,{label:"Cancelled",children:(e,a)=>{t(e,{isStreaming:!1,open:!1,get section(){return u}})},$$slots:{default:!0}});var b=r(c,2);o(b,{label:"Error",children:(e,a)=>{t(e,{hasReasoningError:!0,isStreaming:!1,open:!1,get section(){return u}})},$$slots:{default:!0}}),S(E,m)},$$slots:{default:!0}})},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<StateGallery columns={1}>
	<StateGalleryItem label="Collapsed">
		<ChatMessageReasoningBlock isStreaming={false} open={false} section={reasoningSection} />
	</StateGalleryItem>

	<StateGalleryItem label="Expanded" note="markdown">
		<ChatMessageReasoningBlock isStreaming={false} open section={reasoningSection} />
	</StateGalleryItem>

	<StateGalleryItem label="Streaming">
		<ChatMessageReasoningBlock isStreaming open section={reasoningPendingSection} />
	</StateGalleryItem>

	<StateGalleryItem label="Cancelled">
		<ChatMessageReasoningBlock
			isStreaming={false}
			open={false}
			section={reasoningInterruptedSection}
		/>
	</StateGalleryItem>

	<StateGalleryItem label="Error">
		<ChatMessageReasoningBlock
			hasReasoningError
			isStreaming={false}
			open={false}
			section={reasoningInterruptedSection}
		/>
	</StateGalleryItem>
</StateGallery>`}}});var x=r(l,2);{let n=P(()=>({isStreaming:!1,open:!0,section:s}));h(x,{get args(){return I(n)},beforeEach:()=>$({settings:{renderThinkingAsMarkdown:!1}}),name:"ExpandedPlainText",parameters:{docs:{description:{story:"Separate: turns off the global renderThinkingAsMarkdown setting."}},__svelteCsf:{rawCode:"<ChatMessageReasoningBlock {...args} />"}}})}S(y,i),M()}C.__docgen={data:[],name:"ChatMessageReasoningBlock.stories.svelte"};const v=R(C,q),ht=["States","ExpandedPlainText"],_t={...v.States,tags:["svelte-csf-v5"]},Ct={...v.ExpandedPlainText,tags:["svelte-csf-v5"]};export{Ct as ExpandedPlainText,_t as States,ht as __namedExportsOrder,q as default};
