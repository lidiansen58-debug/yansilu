export function graphFollowupDraftTemplates({ action = "", sourceLabel = "", targetLabel = "", relationLabel = "" } = {}) {
  const cleanAction = String(action || "").trim().toLowerCase();
  const fromLabel = String(sourceLabel || "当前笔记").trim() || "当前笔记";
  const toLabel = String(targetLabel || "目标笔记").trim() || "目标笔记";
  const relLabel = String(relationLabel || "关系").trim() || "关系";
  const withVariants = (selectedVariant = "", variants = [], boundaryDraft = "") => {
    const cleanVariants = Array.isArray(variants) ? variants.filter((variant) => variant?.key && variant?.label) : [];
    const picked = cleanVariants.find((variant) => variant.key === selectedVariant) || cleanVariants[0] || null;
    return {
      selectedVariant: picked?.key || "",
      variants: cleanVariants,
      rationaleDraft: String(picked?.rationaleDraft || "").trim(),
      insightQuestionDraft: String(picked?.insightQuestionDraft || "").trim(),
      boundaryDraft: String(boundaryDraft || "").trim()
    };
  };
  if (cleanAction === "bridge") {
    return withVariants("writing", [
      {
        key: "argument",
        label: "论证版",
        rationaleDraft: `“${fromLabel}”和“${toLabel}”之间还缺一条可检验的中间判断，因为前者已经说明了________，但后者直接跳到了________。把这条桥接补清后，整段论证才不会像跳步。`,
        insightQuestionDraft: `如果读者现在还接不上“${fromLabel}”和“${toLabel}”，最可能是中间缺了哪条判断？`
      },
      {
        key: "writing",
        label: "写作版",
        rationaleDraft: `“${fromLabel}”和“${toLabel}”之间还缺一小步过渡，因为前者已经说明了________，但后者一下子跳到了________。补上这条桥接后，读者才能顺着同一条思路继续往下走。`,
        insightQuestionDraft: `如果要把“${fromLabel}”自然带到“${toLabel}”，中间最缺的那句过渡判断是什么？`
      },
      {
        key: "product",
        label: "产品版",
        rationaleDraft: `从产品理解上看，“${fromLabel}”和“${toLabel}”之间少了一步用户能感知到的过渡：前者负责________，后者直接要求用户理解________。这条桥接要把中间那步认知转换说清楚。`,
        insightQuestionDraft: `如果把这条桥接做成产品提示或交互反馈，最该暴露给用户的那一步是什么？`
      }
    ]);
  }
  if (cleanAction === "relations-edit") {
    return withVariants("argument", [
      {
        key: "argument",
        label: "论证版",
        rationaleDraft: `这条${relLabel}成立，因为“${fromLabel}”会把________补给当前目标；如果拿掉它，读者会在________这一步感觉论证断开。`,
        insightQuestionDraft: `要让这条${relLabel}更可检验，还缺哪条证据、边界或反方？`
      },
      {
        key: "writing",
        label: "写作版",
        rationaleDraft: `在写作顺序里，“${fromLabel}”之所以应该放在这里，是因为它负责把________交代清楚；没有它，后文的________会显得来得太快。`,
        insightQuestionDraft: `如果把这条${relLabel}写成段落过渡，还要补哪一句承上启下的话？`
      },
      {
        key: "product",
        label: "产品版",
        rationaleDraft: `从产品体验看，这条${relLabel}成立，因为“${fromLabel}”提供了用户理解下一步所需的________；如果缺它，用户会在________这里失去判断依据。`,
        insightQuestionDraft: `如果把这条${relLabel}变成界面提示或流程设计，最该补哪一个判断环节？`
      }
    ]);
  }
  if (cleanAction === "relations") {
    return withVariants("argument", [
      {
        key: "argument",
        label: "论证版",
        rationaleDraft: `“${fromLabel}”和“${toLabel}”可以建立${relLabel}，因为前者会把后者所需的________补清楚；这不是简单相关，而是会直接改变读者如何理解目标判断。`,
        insightQuestionDraft: `如果把这条${relLabel}写得更扎实，还需要补哪条证据、条件或反例？`
      },
      {
        key: "writing",
        label: "写作版",
        rationaleDraft: `在文章推进里，“${fromLabel}”和“${toLabel}”适合用${relLabel}连起来，因为前者负责________，后者接着把________往下展开。`,
        insightQuestionDraft: `如果把这条${relLabel}写进草稿，它更适合放在段落开头、中间还是转折处？`
      },
      {
        key: "product",
        label: "产品版",
        rationaleDraft: `从产品判断看，“${fromLabel}”和“${toLabel}”适合建立${relLabel}，因为前者对应的设计选择会直接影响用户如何理解或完成________。`,
        insightQuestionDraft: `如果要把这条${relLabel}落成产品动作、提示或约束，最该出现在哪一步？`
      }
    ]);
  }
  if (cleanAction === "boundary") {
    return withVariants(
      "argument",
      [
        {
          key: "argument",
          label: "论证版",
          boundaryDraft: `这条判断在________条件下成立；一旦遇到________情况，就需要收窄、改写，或补上一条明确的反例。`
        },
        {
          key: "writing",
          label: "写作版",
          boundaryDraft: `如果把这条判断放进文章里，最容易让读者误解的地方是________。为了不写得过满，这里至少要补上________这个例外条件。`
        },
        {
          key: "product",
          label: "产品版",
          boundaryDraft: `从产品使用场景看，这条判断只在________用户条件下成立；一旦遇到________情境，界面或流程就要明确收窄，而不能默认它总是有效。`
        }
      ],
      `这条判断在________条件下成立；一旦遇到________情况，就需要收窄、改写，或补上一条明确的反例。`
    );
  }
  if (cleanAction === "isolate-keep") {
    return withVariants(
      "argument",
      [
        {
          key: "argument",
          label: "论证版",
          boundaryDraft: `暂时独立：这条判断现在先不连线，因为________。如果未来出现________笔记，再考虑把它作为支持、反驳、限定或桥接关系接入。`
        },
        {
          key: "writing",
          label: "写作版",
          boundaryDraft: `暂时独立：这条判断目前更像一段独立论证，不强行接入现有段落，因为________。等写作主题推进到________时，再决定它是否需要成为过渡或反方。`
        },
        {
          key: "product",
          label: "产品版",
          boundaryDraft: `暂时独立：这条判断对应的使用场景还没有和现有产品线索稳定连接，因为________。等出现________场景证据后，再补成正式关系。`
        }
      ],
      `暂时独立：这条判断现在先不连线，因为________。如果未来出现________笔记，再考虑把它作为支持、反驳、限定或桥接关系接入。`
    );
  }
  if (cleanAction === "isolate-hold") {
    return withVariants(
      "argument",
      [
        {
          key: "argument",
          label: "论证版",
          boundaryDraft: `暂存观察：这条笔记现在还缺少稳定判断，暂不接入关系网。下一步先补清________，再判断它应该支持、反驳、限定还是桥接哪条笔记。`
        },
        {
          key: "writing",
          label: "写作版",
          boundaryDraft: `暂存观察：这条笔记暂时只是一段材料或灵感，还不能直接放进文章结构。等它回答了________这个问题，再决定要不要进入写作篮或关系图谱。`
        },
        {
          key: "product",
          label: "产品版",
          boundaryDraft: `暂存观察：这条笔记还没有对应到清楚的用户场景或决策点。先补________，再判断它是否需要和现有产品判断建立关系。`
        }
      ],
      `暂存观察：这条笔记现在还缺少稳定判断，暂不接入关系网。下一步先补清________，再判断它应该支持、反驳、限定还是桥接哪条笔记。`
    );
  }
  if (cleanAction === "tension") {
    return withVariants(
      "argument",
      [
        {
          key: "argument",
          label: "论证版",
          boundaryDraft: `当前最强的反方或反例是________。如果它成立，那么这条判断至少要在________边界内重新表述。`
        },
        {
          key: "writing",
          label: "写作版",
          boundaryDraft: `为了不把这条判断写成单边论证，这里最好先承认________这个反方，再交代为什么最终仍然保留________这个主判断。`
        },
        {
          key: "product",
          label: "产品版",
          boundaryDraft: `如果用户真的处在________这个反向场景里，当前产品判断就会失效或伤害体验。因此至少要在________这一步给出保护、提示或退出条件。`
        }
      ],
      `当前最强的反方或反例是________。如果它成立，那么这条判断至少要在________边界内重新表述。`
    );
  }
  return withVariants("", [], "");
}
