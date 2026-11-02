import{p as M,f as R,g as o,x as r,s as m,a as T,d as H,e as W}from"./iframe-BxvSZK0j.js";import{c as E,i as N,d as V}from"./create-runtime-stories-DF7OwIoM.js";import{S as q,a as l}from"./StateGalleryItem-BMGszy9q.js";import{u as c,a as i,b as d,i as P,l as j,g as k,c as I,d as u,e as _,f as O,h as b,t as z,p as B,j as D,k as J,v as K,n as Q,m as U,o as X,q as Y,r as Z,s as tt,w as et}from"./fixtures-BWDCd2uy.js";import{o as a}from"./ProjectIntro-DKI4MEG7.js";import"./preload-helper-PPVm8Dsz.js";import"./library.constants-v9JM2Zdd.js";import"./info-Cb5cGIZT.js";import"./Icon-CSRBsjq8.js";import"./each-DMxlN0HO.js";import"./svelte-element-BAftWIbD.js";import"./ui.enums-DjR_vYxk.js";import"./settings-vDMD8fT9.js";import"./wrench-C98Yxdx8.js";import"./ActionIcon-CLpfwUjP.js";import"./button-xywSqPau.js";import"./this-PF-vsikk.js";import"./ChatFormCurrentWorkingDirectory-828uF3xY.js";import"./css-classes.constants-B-GZedvn.js";import"./audio-format-YL0iSAfS.js";import"./pwa.constants-BmTqcZii.js";import"./index.svelte-B6jPthz0.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./clone-D1y8Q09X.js";import"./chat-tabs.constants-BXUE-QDX.js";import"./check-DMUsyudZ.js";import"./copy-DUPeaLcG.js";import"./GlassKey-DQnWqGBZ.js";import"./x-DXCCWZ3I.js";import"./input-CLr4-AYd.js";import"./input-BVFa53i-.js";import"./drawer-trigger-DQGelv4k.js";import"./dialog-content-Bi_qY7pE.js";import"./dialog-description-D6Mb1Tvy.js";import"./popover-trigger-DEKMn7ku.js";import"./floating-layer-anchor-DpndBh7P.js";import"./chevron-right-DSI_V293.js";import"./ChatFormContextGauge-CeE9WGbf.js";import"./index.svelte-BBrD1Za8.js";import"./plus-Bas3mM1L.js";import"./ChatFormActionRecord-JuX5z5iA.js";import"./square-BwMbYbuj.js";import"./ChatFormActionSubmit-JvGaFQpW.js";import"./ChatFormActionReasoning-B03i8g7l.js";import"./index-XKzLgq2d.js";import"./minus-BiJPcaSd.js";import"./circle-DEMsv9Zq.js";import"./checkbox-C17vn_rH.js";import"./hidden-input-01vZpQIL.js";import"./collapsible-trigger-DIE3Fs9m.js";import"./chevron-down-D7MPUDbV.js";import"./label-2OikHIdw.js";import"./scroll-area-CP3kH8ff.js";import"./logo-CTAdF4cr.js";import"./index-CDO0wwOG.js";import"./mounted-DosV_eyV.js";import"./separator-DEWw0QPu.js";import"./card-title-Bik3b823.js";import"./ChatScreenActionScrollDown-BfQw16Ii.js";import"./ChatTabsItem-BWqVFd0V.js";import"./ChatScreenDragOverlay-oERtBrSH.js";import"./ChatScreenServerError-kyJSbEPe.js";import"./alert-title-DFRtSKPR.js";import"./ChatScreenStreamResumeStatus-CuLfTRBT.js";import"./SyntaxHighlightedCode-D8sYXQdv.js";import"./CollapsibleTerminalBlock-DKIuhqts.js";import"./download-iVMq-bXa.js";import"./index-C9PbKOs8.js";import"./pencil-9rXUpy81.js";import"./index-DwS4Awyr.js";import"./textarea-q08Yt5sv.js";import"./trash-BrTaTTho.js";import"./empty-title-7hSBoaDA.js";import"./skeleton-Bcv1uFKK.js";import"./toggle-group-item-BeZEKUxW.js";import"./toggle-BbwUMDz5.js";import"./McpCapabilitiesBadges-mSrUEJ8e.js";import"./badge-Cdt4ydpE.js";import"./message-square-BRQcxciD.js";import"./McpConnectionLogs-CaNlXDPy.js";import"./radio-group-item-BtppKCUx.js";import"./switch-D5IRHhP0.js";import"./ChatScreenGreeting-DUs05vEq.js";import"./button-group-separator-BccWv2la.js";import"./hover-card-trigger-46ZsC1b5.js";const at={component:a,parameters:{layout:"centered"},title:"Chat/ChatScreen/ChatAttachments/ChatAttachmentsList"},{Story:ot}=V(),s=p=>console.log("remove",p);var rt=W("<!> <!> <!> <!> <!> <!> <!> <!> <!>",1);function G(p,C){M(C,!1),N(),ot(p,{asChild:!0,name:"States",children:(x,nt)=>{q(x,{columns:1,children:(F,mt)=>{var h=rt(),g=R(h);l(g,{label:"Pending uploads",note:"chat form, removable",children:(t,n)=>{{let e=r(()=>[c,i,d]);a(t,{class:"w-[40rem]",onFileRemove:s,get uploadedFiles(){return o(e)}})}},$$slots:{default:!0}});var $=m(g,2);l($,{label:"Images only",note:"readonly",children:(t,n)=>{{let e=r(()=>[P,j,k]);a(t,{get attachments(){return o(e)},class:"w-[40rem]",imageHeight:"h-48",imageWidth:"max-w-72",readonly:!0})}},$$slots:{default:!0}});var y=m($,2);l(y,{label:"Files only",children:(t,n)=>{{let e=r(()=>[i,I,d,u,_,O]);a(t,{class:"w-[40rem]",onFileRemove:s,get uploadedFiles(){return o(e)}})}},$$slots:{default:!0}});var A=m(y,2);l(A,{label:"Mixed, removable",children:(t,n)=>{{let e=r(()=>[c,b,i,d,u]);a(t,{class:"w-[40rem]",onFileRemove:s,get uploadedFiles(){return o(e)}})}},$$slots:{default:!0}});var f=m(A,2);l(f,{label:"Mixed, readonly",note:"as shown in a sent message",children:(t,n)=>{{let e=r(()=>[P,z,B,D,J,K]);a(t,{get attachments(){return o(e)},class:"w-[40rem]",imageHeight:"h-48",imageWidth:"max-w-72",readonly:!0})}},$$slots:{default:!0}});var S=m(f,2);l(S,{label:"Readonly text file",children:(t,n)=>{{let e=r(()=>[Q]);a(t,{get attachments(){return o(e)},class:"w-[40rem]",readonly:!0})}},$$slots:{default:!0}});var v=m(S,2);l(v,{label:"MCP prompts",note:"ready, loading, error",children:(t,n)=>{{let e=r(()=>[U,X,Y]);a(t,{class:"w-[40rem]",onFileRemove:s,get uploadedFiles(){return o(e)}})}},$$slots:{default:!0}});var w=m(v,2);l(w,{label:"MCP, readonly",children:(t,n)=>{{let e=r(()=>[Z,tt]);a(t,{get attachments(){return o(e)},class:"w-[40rem]",readonly:!0})}},$$slots:{default:!0}});var L=m(w,2);l(L,{label:"Single row overflow",children:(t,n)=>{{let e=r(()=>[c,b,et,i,I,d,u,_]);a(t,{class:"w-[28rem]",limitToSingleRow:!0,onFileRemove:s,get uploadedFiles(){return o(e)}})}},$$slots:{default:!0}}),T(F,h)},$$slots:{default:!0}})},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<StateGallery columns={1}>
	<StateGalleryItem label="Pending uploads" note="chat form, removable">
		<ChatAttachmentsList
			class="w-[40rem]"
			{onFileRemove}
			uploadedFiles={[uploadedImage, uploadedText, uploadedPdf]}
		/>
	</StateGalleryItem>

	<StateGalleryItem label="Images only" note="readonly">
		<ChatAttachmentsList
			attachments={[imageAttachment, logoAttachment, gradientAttachment]}
			class="w-[40rem]"
			imageHeight="h-48"
			imageWidth="max-w-72"
			readonly
		/>
	</StateGalleryItem>

	<StateGalleryItem label="Files only">
		<ChatAttachmentsList
			class="w-[40rem]"
			{onFileRemove}
			uploadedFiles={[
				uploadedText,
				uploadedNotes,
				uploadedPdf,
				uploadedAudio,
				uploadedVideo,
				uploadedArchive
			]}
		/>
	</StateGalleryItem>

	<StateGalleryItem label="Mixed, removable">
		<ChatAttachmentsList
			class="w-[40rem]"
			{onFileRemove}
			uploadedFiles={[uploadedImage, uploadedLogo, uploadedText, uploadedPdf, uploadedAudio]}
		/>
	</StateGalleryItem>

	<StateGalleryItem label="Mixed, readonly" note="as shown in a sent message">
		<ChatAttachmentsList
			attachments={[
				imageAttachment,
				textAttachment,
				pdfAttachment,
				pdfAsImagesAttachment,
				audioAttachment,
				videoAttachment
			]}
			class="w-[40rem]"
			imageHeight="h-48"
			imageWidth="max-w-72"
			readonly
		/>
	</StateGalleryItem>

	<StateGalleryItem label="Readonly text file">
		<ChatAttachmentsList attachments={[notesAttachment]} class="w-[40rem]" readonly />
	</StateGalleryItem>

	<StateGalleryItem label="MCP prompts" note="ready, loading, error">
		<ChatAttachmentsList
			class="w-[40rem]"
			{onFileRemove}
			uploadedFiles={[uploadedMcpPrompt, uploadedMcpPromptLoading, uploadedMcpPromptError]}
		/>
	</StateGalleryItem>

	<StateGalleryItem label="MCP, readonly">
		<ChatAttachmentsList
			attachments={[mcpPromptAttachment, mcpResourceAttachment]}
			class="w-[40rem]"
			readonly
		/>
	</StateGalleryItem>

	<StateGalleryItem label="Single row overflow">
		<ChatAttachmentsList
			class="w-[28rem]"
			limitToSingleRow
			{onFileRemove}
			uploadedFiles={[
				uploadedImage,
				uploadedLogo,
				uploadedGradient,
				uploadedText,
				uploadedNotes,
				uploadedPdf,
				uploadedAudio,
				uploadedVideo
			]}
		/>
	</StateGalleryItem>
</StateGallery>`}}}),H()}G.__docgen={data:[],name:"ChatAttachmentsList.stories.svelte"};const lt=E(G,at),Ve=["States"],qe={...lt.States,tags:["svelte-csf-v5"]};export{qe as States,Ve as __namedExportsOrder,at as default};
