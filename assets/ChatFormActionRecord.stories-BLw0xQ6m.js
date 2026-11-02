import{p as M,f as h,s as e,a as y,d as R,e as f}from"./iframe-BxvSZK0j.js";import{c as G,i as I,d as F}from"./create-runtime-stories-DF7OwIoM.js";import{S as N,a}from"./StateGalleryItem-BMGszy9q.js";import{C as o}from"./ChatFormActionRecord-JuX5z5iA.js";import"./preload-helper-PPVm8Dsz.js";import"./button-xywSqPau.js";import"./this-PF-vsikk.js";import"./library.constants-v9JM2Zdd.js";import"./info-Cb5cGIZT.js";import"./Icon-CSRBsjq8.js";import"./each-DMxlN0HO.js";import"./svelte-element-BAftWIbD.js";import"./ui.enums-DjR_vYxk.js";import"./settings-vDMD8fT9.js";import"./wrench-C98Yxdx8.js";import"./css-classes.constants-B-GZedvn.js";import"./square-BwMbYbuj.js";const P={component:o,parameters:{layout:"centered"},title:"Chat/ChatScreen/ChatForm/ChatFormActionRecord"},{Story:$}=F();var T=f("<!> <!> <!> <!> <!>",1),L=f("<!> <!>",1);function A(S,v){M(v,!1),I();var s=L(),i=h(s);$(i,{asChild:!0,name:"States",children:(l,d)=>{N(l,{columns:5,children:(g,w)=>{var n=T(),m=h(n);a(m,{label:"Idle",children:(t,r)=>{o(t,{hasAudioModality:!0})},$$slots:{default:!0}});var c=e(m,2);a(c,{label:"Recording",children:(t,r)=>{o(t,{hasAudioModality:!0,isRecording:!0})},$$slots:{default:!0}});var u=e(c,2);a(u,{label:"Loading",children:(t,r)=>{o(t,{hasAudioModality:!0,isLoading:!0})},$$slots:{default:!0}});var p=e(u,2);a(p,{label:"Disabled",children:(t,r)=>{o(t,{disabled:!0,hasAudioModality:!0})},$$slots:{default:!0}});var b=e(p,2);a(b,{label:"No audio",note:"model lacks audio",children:(t,r)=>{o(t,{hasAudioModality:!1})},$$slots:{default:!0}}),y(g,n)},$$slots:{default:!0}})},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<StateGallery columns={5}>
	<StateGalleryItem label="Idle">
		<ChatFormActionRecord hasAudioModality />
	</StateGalleryItem>

	<StateGalleryItem label="Recording">
		<ChatFormActionRecord hasAudioModality isRecording />
	</StateGalleryItem>

	<StateGalleryItem label="Loading">
		<ChatFormActionRecord hasAudioModality isLoading />
	</StateGalleryItem>

	<StateGalleryItem label="Disabled">
		<ChatFormActionRecord disabled hasAudioModality />
	</StateGalleryItem>

	<StateGalleryItem label="No audio" note="model lacks audio">
		<ChatFormActionRecord hasAudioModality={false} />
	</StateGalleryItem>
</StateGallery>`}}});var C=e(i,2);$(C,{args:{hasAudioModality:!1},name:"NoAudioModalityTooltip",play:async({canvas:l,userEvent:d})=>{await d.hover(l.getAllByRole("button",{name:"Start recording"})[0])},parameters:{docs:{description:{story:"separate: play hovers the button to open its tooltip"}},__svelteCsf:{rawCode:"<ChatFormActionRecord {...args} />"}}}),y(S,s),R()}A.__docgen={data:[],name:"ChatFormActionRecord.stories.svelte"};const _=G(A,P),Y=["States","NoAudioModalityTooltip"],Z={..._.States,tags:["svelte-csf-v5"]},tt={..._.NoAudioModalityTooltip,tags:["svelte-csf-v5"]};export{tt as NoAudioModalityTooltip,Z as States,Y as __namedExportsOrder,P as default};
